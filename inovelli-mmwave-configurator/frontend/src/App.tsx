import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomSetup } from './components/RoomSetup';
import { TopDownView } from './components/TopDownView';
import { SideView } from './components/SideView';
import { ZoneControls } from './components/ZoneControls';
import { DeviceSelector } from './components/DeviceSelector';
import { RoomObjects } from './components/RoomObjects';
import { useHomeAssistant } from './hooks/useHomeAssistant';
import { getSetting, saveSetting, getRooms, getRoom, createRoom, saveRoom, RoomRecord } from './api';
import {
  RoomDimensions,
  ZoneBounds,
  DetectionSettings,
  HADevice,
  UnitSystem,
  RoomObstacle,
  FurnitureItem,
  SensorPosition,
  DEFAULT_ROOM,
  DEFAULT_ZONE,
  DEFAULT_DETECTION,
} from './types';

function getDefaultWsUrl(): string {
  const stored = localStorage.getItem('ha_url');
  if (stored) return stored;

  // Auto-detect WebSocket URL based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/websocket`;
}

function App() {
  // Connection settings
  const [haUrl, setHaUrl] = useState(getDefaultWsUrl);
  const [haToken, setHaToken] = useState(() => {
    return localStorage.getItem('ha_token') || '';
  });
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('ha_token'));

  // Room and zone state
  const [room, setRoom] = useState<RoomDimensions>(DEFAULT_ROOM);
  const [zone, setZone] = useState<ZoneBounds>(DEFAULT_ZONE);
  const [detection, setDetection] = useState<DetectionSettings>(DEFAULT_DETECTION);
  const [selectedDevice, setSelectedDevice] = useState<HADevice | null>(null);
  const [units, setUnits] = useState<UnitSystem>(() => {
    return (localStorage.getItem('units') as UnitSystem) || 'imperial';
  });
  const [obstacles, setObstacles] = useState<RoomObstacle[]>([]);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>('Default Room');
  const [_savedRooms, setSavedRooms] = useState<RoomRecord[]>([]); // Used internally, will add room selector UI later
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);
  const prevSensorXRef = useRef<number>(DEFAULT_ROOM.sensorX);

  // Per-device sensor positions (deviceId -> position)
  const [sensorPositions, setSensorPositions] = useState<Record<string, SensorPosition>>({});

  // Home Assistant connection
  const {
    isConnected,
    isLoading,
    devices,
    targets,
    error,
    connect,
    disconnect,
    discoverDevices,
    readDeviceValues,
    writeDeviceValues,
  } = useHomeAssistant({ url: haUrl, token: haToken });

  // Get all devices in the current room (same areaName)
  const devicesInRoom = devices.filter(d => d.areaName === currentRoomName);

  // Get sensor position for a device (with default)
  const getSensorPosition = useCallback((deviceId: string): SensorPosition => {
    return sensorPositions[deviceId] || {
      wall: 'top',
      position: room.width / 2,  // Default to center of top wall
      height: 120,
    };
  }, [sensorPositions, room.width]);

  // Update sensor position for a device
  const updateSensorPosition = useCallback((deviceId: string, position: SensorPosition) => {
    setSensorPositions(prev => {
      const updated = { ...prev, [deviceId]: position };
      // Save to settings
      saveSetting('sensorPositions', updated);
      return updated;
    });
  }, []);

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Save connection settings
  useEffect(() => {
    localStorage.setItem('ha_url', haUrl);
    localStorage.setItem('ha_token', haToken);
  }, [haUrl, haToken]);

  // Save units preference
  useEffect(() => {
    localStorage.setItem('units', units);
  }, [units]);

  // Load sensor positions on mount
  useEffect(() => {
    const loadSensorPositions = async () => {
      const positions = await getSetting<Record<string, SensorPosition>>('sensorPositions');
      if (positions) {
        setSensorPositions(positions);
      }
    };
    loadSensorPositions();
  }, []);

  // Load rooms from database on mount
  useEffect(() => {
    const loadRooms = async () => {
      setIsLoadingRoom(true);
      const rooms = await getRooms();
      setSavedRooms(rooms);

      // Load last used room ID from settings
      const lastRoomId = await getSetting<number>('lastRoomId');

      if (lastRoomId && rooms.some(r => r.id === lastRoomId)) {
        // Load the last used room
        const roomData = await getRoom(lastRoomId);
        if (roomData) {
          const loadedSensorX = roomData.sensor_x ?? DEFAULT_ROOM.sensorX;
          setCurrentRoomId(lastRoomId);
          setCurrentRoomName(roomData.name || 'Default Room');
          setRoom({
            width: roomData.width || DEFAULT_ROOM.width,
            depth: roomData.depth || DEFAULT_ROOM.depth,
            height: roomData.height || DEFAULT_ROOM.height,
            sensorX: loadedSensorX,
            sensorHeight: roomData.sensor_height ?? DEFAULT_ROOM.sensorHeight,
          });
          prevSensorXRef.current = loadedSensorX;
          if (roomData.obstacles) {
            setObstacles(roomData.obstacles.map(o => ({
              id: `obstacle-${o.id}`,
              type: o.type as 'wall' | 'exclusion',
              name: o.name,
              x1: o.x1,
              y1: o.y1,
              x2: o.x2,
              y2: o.y2,
              zMin: o.z_min,
              zMax: o.z_max,
            })));
          }
          if (roomData.furniture) {
            setFurniture(roomData.furniture.map(f => ({
              id: `furniture-${f.id}`,
              type: f.type as FurnitureItem['type'],
              name: f.name,
              x: f.x,
              y: f.y,
              width: f.width,
              depth: f.depth,
              height: f.height,
              rotation: f.rotation,
            })));
          }
        }
      } else if (rooms.length > 0) {
        // Use the most recent room
        const roomData = await getRoom(rooms[0].id);
        if (roomData) {
          const loadedSensorX = roomData.sensor_x ?? DEFAULT_ROOM.sensorX;
          setCurrentRoomId(rooms[0].id);
          setCurrentRoomName(roomData.name || 'Default Room');
          setRoom({
            width: roomData.width || DEFAULT_ROOM.width,
            depth: roomData.depth || DEFAULT_ROOM.depth,
            height: roomData.height || DEFAULT_ROOM.height,
            sensorX: loadedSensorX,
            sensorHeight: roomData.sensor_height ?? DEFAULT_ROOM.sensorHeight,
          });
          prevSensorXRef.current = loadedSensorX;
          if (roomData.obstacles) {
            setObstacles(roomData.obstacles.map(o => ({
              id: `obstacle-${o.id}`,
              type: o.type as 'wall' | 'exclusion',
              name: o.name,
              x1: o.x1,
              y1: o.y1,
              x2: o.x2,
              y2: o.y2,
              zMin: o.z_min,
              zMax: o.z_max,
            })));
          }
          if (roomData.furniture) {
            setFurniture(roomData.furniture.map(f => ({
              id: `furniture-${f.id}`,
              type: f.type as FurnitureItem['type'],
              name: f.name,
              x: f.x,
              y: f.y,
              width: f.width,
              depth: f.depth,
              height: f.height,
              rotation: f.rotation,
            })));
          }
        }
      } else {
        // Create a default room
        const newRoomId = await createRoom({
          name: 'Default Room',
          width: DEFAULT_ROOM.width,
          depth: DEFAULT_ROOM.depth,
          height: DEFAULT_ROOM.height,
          sensor_x: DEFAULT_ROOM.sensorX,
          sensor_height: DEFAULT_ROOM.sensorHeight,
        });
        if (newRoomId) {
          setCurrentRoomId(newRoomId);
          prevSensorXRef.current = DEFAULT_ROOM.sensorX;
          setSavedRooms([{
            id: newRoomId,
            name: 'Default Room',
            width: DEFAULT_ROOM.width,
            depth: DEFAULT_ROOM.depth,
            height: DEFAULT_ROOM.height,
            sensor_x: DEFAULT_ROOM.sensorX,
            sensor_height: DEFAULT_ROOM.sensorHeight,
          }]);
        }
      }
      setIsLoadingRoom(false);
    };
    loadRooms();
  }, []);

  // Recalculate zone bounds when sensor position changes (keep zone in same room position)
  useEffect(() => {
    if (isLoadingRoom) return;

    const prevSensorX = prevSensorXRef.current;
    const currentSensorX = room.sensorX;

    if (prevSensorX !== currentSensorX) {
      const delta = currentSensorX - prevSensorX;
      // Adjust zone bounds by negative delta so zone stays in same room position
      setZone(prev => ({
        ...prev,
        xMin: prev.xMin - delta,
        xMax: prev.xMax - delta,
      }));
      prevSensorXRef.current = currentSensorX;
    }
  }, [room.sensorX, isLoadingRoom]);

  // Auto-save room changes to database (debounced)
  const saveRoomToDb = useCallback(async () => {
    if (!currentRoomId) return;
    await saveRoom(currentRoomId, {
      name: currentRoomName,
      width: room.width,
      depth: room.depth,
      height: room.height,
      sensor_x: room.sensorX,
      sensor_height: room.sensorHeight,
      obstacles: obstacles.map(o => ({
        type: o.type,
        name: o.name,
        x1: o.x1,
        y1: o.y1,
        x2: o.x2,
        y2: o.y2,
        zMin: o.zMin,
        zMax: o.zMax,
      })),
      furniture: furniture.map(f => ({
        type: f.type,
        name: f.name,
        x: f.x,
        y: f.y,
        width: f.width,
        depth: f.depth,
        height: f.height,
        rotation: f.rotation,
      })),
    });
    saveSetting('lastRoomId', currentRoomId);
  }, [currentRoomId, currentRoomName, room, obstacles, furniture]);

  // Debounced save effect
  useEffect(() => {
    if (isLoadingRoom || !currentRoomId) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveRoomToDb();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [room, obstacles, furniture, currentRoomId, isLoadingRoom, saveRoomToDb]);

  // Auto-connect on load if we have credentials
  useEffect(() => {
    if (haToken && !isConnected && !isLoading) {
      connect();
    }
  }, []);

  // Load or create a room by name (used when selecting a device)
  const loadOrCreateRoomByName = useCallback(async (roomName: string) => {
    setIsLoadingRoom(true);

    // First, refresh rooms list
    const rooms = await getRooms();
    setSavedRooms(rooms);

    // Look for a room with matching name
    const existingRoom = rooms.find(r => r.name === roomName);

    if (existingRoom) {
      // Load the existing room
      const roomData = await getRoom(existingRoom.id);
      if (roomData) {
        const loadedSensorX = roomData.sensor_x ?? DEFAULT_ROOM.sensorX;
        setCurrentRoomId(existingRoom.id);
        setCurrentRoomName(roomName);
        setRoom({
          width: roomData.width || DEFAULT_ROOM.width,
          depth: roomData.depth || DEFAULT_ROOM.depth,
          height: roomData.height || DEFAULT_ROOM.height,
          sensorX: loadedSensorX,
          sensorHeight: roomData.sensor_height ?? DEFAULT_ROOM.sensorHeight,
        });
        prevSensorXRef.current = loadedSensorX;
        if (roomData.obstacles) {
          setObstacles(roomData.obstacles.map(o => ({
            id: `obstacle-${o.id}`,
            type: o.type as 'wall' | 'exclusion',
            name: o.name,
            x1: o.x1,
            y1: o.y1,
            x2: o.x2,
            y2: o.y2,
            zMin: o.z_min,
            zMax: o.z_max,
          })));
        } else {
          setObstacles([]);
        }
        if (roomData.furniture) {
          setFurniture(roomData.furniture.map(f => ({
            id: `furniture-${f.id}`,
            type: f.type as FurnitureItem['type'],
            name: f.name,
            x: f.x,
            y: f.y,
            width: f.width,
            depth: f.depth,
            height: f.height,
            rotation: f.rotation,
          })));
        } else {
          setFurniture([]);
        }
        saveSetting('lastRoomId', existingRoom.id);
      }
    } else {
      // Create a new room with this name
      const newRoomId = await createRoom({
        name: roomName,
        width: DEFAULT_ROOM.width,
        depth: DEFAULT_ROOM.depth,
        height: DEFAULT_ROOM.height,
        sensor_x: DEFAULT_ROOM.sensorX,
        sensor_height: DEFAULT_ROOM.sensorHeight,
      });
      if (newRoomId) {
        setCurrentRoomId(newRoomId);
        setCurrentRoomName(roomName);
        setRoom(DEFAULT_ROOM);
        setObstacles([]);
        setFurniture([]);
        prevSensorXRef.current = DEFAULT_ROOM.sensorX;
        saveSetting('lastRoomId', newRoomId);
      }
    }

    setIsLoadingRoom(false);
  }, []);

  // Auto-select first device when devices are discovered
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      const firstDevice = devices[0];
      setSelectedDevice(firstDevice);
      const values = readDeviceValues(firstDevice);
      if (values) {
        setZone(values.zone);
        setDetection(values.detection);
      }
      // Load room for this device's area
      if (firstDevice.areaName) {
        loadOrCreateRoomByName(firstDevice.areaName);
      }
    }
  }, [devices, selectedDevice, readDeviceValues, loadOrCreateRoomByName]);

  // Read device values when device is selected
  const handleReadFromDevice = () => {
    if (!selectedDevice) return;
    const values = readDeviceValues(selectedDevice);
    if (values) {
      setZone(values.zone);
      setDetection(values.detection);
      setStatusMessage('Values read from device');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Write values to device
  const handleWriteToDevice = async () => {
    if (!selectedDevice) return;
    try {
      await writeDeviceValues(selectedDevice, zone, detection);
      setStatusMessage('Values written to device');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Write failed'}`);
    }
  };

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">
            Inovelli mmWave Zone Configurator
          </h1>
          <div className="flex items-center gap-3">
            {/* Unit Toggle */}
            <div className="flex bg-slate-700 rounded overflow-hidden">
              <button
                onClick={() => setUnits('imperial')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  units === 'imperial'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                in
              </button>
              <button
                onClick={() => setUnits('metric')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  units === 'metric'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                cm
              </button>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
              title="Settings"
            >
              <svg
                className="w-5 h-5 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Home Assistant Connection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">WebSocket URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={haUrl}
                    onChange={(e) => setHaUrl(e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => {
                      localStorage.removeItem('ha_url');
                      setHaUrl(getDefaultWsUrl());
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
                    title="Reset to auto-detected URL"
                  >
                    Auto
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Long-Lived Access Token</label>
                <input
                  type="password"
                  value={haToken}
                  onChange={(e) => setHaToken(e.target.value)}
                  placeholder="Enter your access token"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  isConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
              </button>
              <span
                className={`flex items-center gap-2 text-sm ${
                  isConnected ? 'text-green-400' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-slate-500'
                  }`}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {error && <span className="text-red-400 text-sm">{error}</span>}
            </div>
          </div>
        )}

        {/* Device Selector */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <DeviceSelector
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={(device) => {
              setSelectedDevice(device);
              const values = readDeviceValues(device);
              if (values) {
                setZone(values.zone);
                setDetection(values.detection);
              }
              // Load room for this device's area
              if (device.areaName) {
                loadOrCreateRoomByName(device.areaName);
              }
            }}
            onRefresh={discoverDevices}
            isConnected={isConnected}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Canvas Views */}
          <TopDownView
            room={room}
            zone={zone}
            onZoneChange={setZone}
            units={units}
            targets={targets}
            obstacles={obstacles}
            furniture={furniture}
            onObstaclesChange={setObstacles}
            onFurnitureChange={setFurniture}
            sensorsInRoom={devicesInRoom.map(device => ({
              device,
              position: getSensorPosition(device.id),
              isSelected: device.id === selectedDevice?.id,
            }))}
            onSelectSensor={(deviceId) => {
              const device = devices.find(d => d.id === deviceId);
              if (device) {
                setSelectedDevice(device);
                const values = readDeviceValues(device);
                if (values) {
                  setZone(values.zone);
                  setDetection(values.detection);
                }
              }
            }}
          />
          <SideView
            room={room}
            zone={zone}
            onZoneChange={setZone}
            units={units}
            targets={targets}
            furniture={furniture}
            onFurnitureChange={setFurniture}
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <RoomSetup
            room={room}
            onChange={setRoom}
            units={units}
            sensorPosition={selectedDevice ? getSensorPosition(selectedDevice.id) : undefined}
            onSensorPositionChange={selectedDevice ? (pos) => updateSensorPosition(selectedDevice.id, pos) : undefined}
            selectedDeviceName={selectedDevice?.name}
          />
          <div className="md:col-span-2">
            <ZoneControls
              zone={zone}
              detection={detection}
              onZoneChange={setZone}
              onDetectionChange={setDetection}
              units={units}
            />
          </div>
          <RoomObjects
            obstacles={obstacles}
            furniture={furniture}
            onObstaclesChange={setObstacles}
            onFurnitureChange={setFurniture}
            units={units}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReadFromDevice}
            disabled={!isConnected || !selectedDevice || isLoading}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Read from Device
          </button>
          <button
            onClick={handleWriteToDevice}
            disabled={!isConnected || !selectedDevice || isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Write to Device
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white shadow-lg">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
