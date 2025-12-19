import { useState, useEffect, useCallback, useRef } from 'react';
import { HADevice, HAEntityState, ZoneBounds, DetectionSettings } from '../types';

interface UseHomeAssistantOptions {
  url: string;
  token: string;
}

interface HAMessage {
  id?: number;
  type: string;
  success?: boolean;
  result?: unknown;
  event?: {
    data?: {
      entity_id?: string;
      new_state?: HAEntityState;
    };
  };
}

// Entity name patterns for VZM32-SN mmWave attributes (from ZHA quirk)
const ENTITY_PATTERNS = {
  xMin: /_mmwave_x_min$/,
  xMax: /_mmwave_x_max$/,
  yMin: /_mmwave_y_min$/,
  yMax: /_mmwave_y_max$/,
  zMin: /_mmwave_z_min$/,
  zMax: /_mmwave_z_max$/,
  sensitivity: /_mmwave_detect_sensitivity$/,
  delay: /_mmwave_detect_trigger$/,
  holdTime: /_mmwave_hold_time$/,
};

export function useHomeAssistant({ url, token }: UseHomeAssistantOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<HADevice[]>([]);
  const [entityStates, setEntityStates] = useState<Map<string, HAEntityState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(1);
  const pendingCallsRef = useRef<Map<number, (result: unknown) => void>>(new Map());

  const sendMessage = useCallback((message: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const id = messageIdRef.current++;
      const msg = { ...message, id };

      pendingCallsRef.current.set(id, resolve);
      wsRef.current.send(JSON.stringify(msg));

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingCallsRef.current.has(id)) {
          pendingCallsRef.current.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsLoading(true);
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const message: HAMessage = JSON.parse(event.data);

        if (message.type === 'auth_required') {
          ws.send(JSON.stringify({ type: 'auth', access_token: token }));
        } else if (message.type === 'auth_ok') {
          setIsConnected(true);
          setIsLoading(false);
          // Subscribe to state changes
          sendMessage({ type: 'subscribe_events', event_type: 'state_changed' });
        } else if (message.type === 'auth_invalid') {
          setError('Invalid access token');
          setIsLoading(false);
          ws.close();
        } else if (message.type === 'result' && message.id) {
          const callback = pendingCallsRef.current.get(message.id);
          if (callback) {
            pendingCallsRef.current.delete(message.id);
            callback(message.result);
          }
        } else if (message.type === 'event' && message.event?.data?.new_state) {
          const newState = message.event.data.new_state;
          setEntityStates((prev) => {
            const next = new Map(prev);
            next.set(newState.entity_id, newState);
            return next;
          });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        setIsLoading(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsLoading(false);
    }
  }, [url, token, sendMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const discoverDevices = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      // Get all states
      const states = (await sendMessage({ type: 'get_states' })) as HAEntityState[];

      // Find mmWave entities - look for any entity containing 'mmwave'
      const mmwaveEntities = states.filter(
        (state) =>
          state.entity_id.toLowerCase().includes('mmwave')
      );

      // Debug: log all found mmWave entities
      console.log('Found mmWave entities:', mmwaveEntities.map(e => e.entity_id));

      // Update entity states
      const newStates = new Map<string, HAEntityState>();
      mmwaveEntities.forEach((state) => {
        newStates.set(state.entity_id, state);
      });
      setEntityStates(newStates);

      // Group by device (extract device name from entity_id)
      const deviceMap = new Map<string, HADevice>();

      mmwaveEntities.forEach((state) => {
        // Extract device name from entity_id (e.g., "number.switch_mmwave_width_minimum_left" -> "switch")
        const match = state.entity_id.match(/^number\.(.+?)_mmwave_/);
        if (!match) return;

        const deviceName = match[1];
        if (!deviceMap.has(deviceName)) {
          deviceMap.set(deviceName, {
            id: deviceName,
            name: deviceName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            entities: {
              xMin: '',
              xMax: '',
              yMin: '',
              yMax: '',
              zMin: '',
              zMax: '',
              sensitivity: '',
              delay: '',
              holdTime: '',
            },
          });
        }

        const device = deviceMap.get(deviceName)!;

        // Match entity to attribute
        for (const [key, pattern] of Object.entries(ENTITY_PATTERNS)) {
          if (pattern.test(state.entity_id)) {
            device.entities[key as keyof typeof device.entities] = state.entity_id;
            break;
          }
        }
      });

      // Filter to only complete devices (have all required entities)
      const completeDevices = Array.from(deviceMap.values()).filter((device) =>
        Object.values(device.entities).every((entity) => entity !== '')
      );

      setDevices(completeDevices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover devices');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendMessage]);

  const readDeviceValues = useCallback(
    (device: HADevice): { zone: ZoneBounds; detection: DetectionSettings } | null => {
      const getEntityValue = (entityId: string): number => {
        const state = entityStates.get(entityId);
        if (!state) return 0;
        return parseFloat(state.state) || 0;
      };

      if (!device.entities.xMin) return null;

      return {
        zone: {
          xMin: getEntityValue(device.entities.xMin),
          xMax: getEntityValue(device.entities.xMax),
          yMin: getEntityValue(device.entities.yMin),
          yMax: getEntityValue(device.entities.yMax),
          zMin: getEntityValue(device.entities.zMin),
          zMax: getEntityValue(device.entities.zMax),
        },
        detection: {
          sensitivity: getEntityValue(device.entities.sensitivity) as 0 | 1 | 2,
          delay: getEntityValue(device.entities.delay) as 0 | 1 | 2,
          holdTime: getEntityValue(device.entities.holdTime),
        },
      };
    },
    [entityStates]
  );

  const writeDeviceValues = useCallback(
    async (device: HADevice, zone: ZoneBounds, detection: DetectionSettings) => {
      if (!isConnected) {
        throw new Error('Not connected');
      }

      setIsLoading(true);
      try {
        const calls = [
          { entity: device.entities.xMin, value: zone.xMin },
          { entity: device.entities.xMax, value: zone.xMax },
          { entity: device.entities.yMin, value: zone.yMin },
          { entity: device.entities.yMax, value: zone.yMax },
          { entity: device.entities.zMin, value: zone.zMin },
          { entity: device.entities.zMax, value: zone.zMax },
          { entity: device.entities.sensitivity, value: detection.sensitivity },
          { entity: device.entities.delay, value: detection.delay },
          { entity: device.entities.holdTime, value: detection.holdTime },
        ];

        for (const call of calls) {
          await sendMessage({
            type: 'call_service',
            domain: 'number',
            service: 'set_value',
            service_data: {
              entity_id: call.entity,
              value: call.value,
            },
          });
          // Small delay between calls to avoid overwhelming the device
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, sendMessage]
  );

  // Auto-discover devices when connected
  useEffect(() => {
    if (isConnected) {
      discoverDevices();
    }
  }, [isConnected, discoverDevices]);

  return {
    isConnected,
    isLoading,
    devices,
    error,
    connect,
    disconnect,
    discoverDevices,
    readDeviceValues,
    writeDeviceValues,
  };
}
