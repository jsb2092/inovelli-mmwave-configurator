import { useState, useEffect } from 'react';
import { RoomSetup } from './components/RoomSetup';
import { TopDownView } from './components/TopDownView';
import { SideView } from './components/SideView';
import { ZoneControls } from './components/ZoneControls';
import { DeviceSelector } from './components/DeviceSelector';
import { useHomeAssistant } from './hooks/useHomeAssistant';
import {
  RoomDimensions,
  ZoneBounds,
  DetectionSettings,
  HADevice,
  DEFAULT_ROOM,
  DEFAULT_ZONE,
  DEFAULT_DETECTION,
} from './types';

function App() {
  // Connection settings
  const [haUrl, setHaUrl] = useState(() => {
    return localStorage.getItem('ha_url') || 'ws://homeassistant.local:8123/api/websocket';
  });
  const [haToken, setHaToken] = useState(() => {
    return localStorage.getItem('ha_token') || '';
  });
  const [showSettings, setShowSettings] = useState(false);

  // Room and zone state
  const [room, setRoom] = useState<RoomDimensions>(DEFAULT_ROOM);
  const [zone, setZone] = useState<ZoneBounds>(DEFAULT_ZONE);
  const [detection, setDetection] = useState<DetectionSettings>(DEFAULT_DETECTION);
  const [selectedDevice, setSelectedDevice] = useState<HADevice | null>(null);

  // Home Assistant connection
  const {
    isConnected,
    isLoading,
    devices,
    error,
    connect,
    disconnect,
    discoverDevices,
    readDeviceValues,
    writeDeviceValues,
  } = useHomeAssistant({ url: haUrl, token: haToken });

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Save connection settings
  useEffect(() => {
    localStorage.setItem('ha_url', haUrl);
    localStorage.setItem('ha_token', haToken);
  }, [haUrl, haToken]);

  // Auto-connect on load if we have credentials
  useEffect(() => {
    if (haToken && !isConnected && !isLoading) {
      connect();
    }
  }, []);

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

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Home Assistant Connection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">WebSocket URL</label>
                <input
                  type="text"
                  value={haUrl}
                  onChange={(e) => setHaUrl(e.target.value)}
                  placeholder="ws://homeassistant.local:8123/api/websocket"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
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
            }}
            onRefresh={discoverDevices}
            isConnected={isConnected}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Canvas Views */}
          <TopDownView room={room} zone={zone} onZoneChange={setZone} />
          <SideView room={room} zone={zone} onZoneChange={setZone} />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <RoomSetup room={room} onChange={setRoom} />
          <div className="md:col-span-2">
            <ZoneControls
              zone={zone}
              detection={detection}
              onZoneChange={setZone}
              onDetectionChange={setDetection}
            />
          </div>
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
