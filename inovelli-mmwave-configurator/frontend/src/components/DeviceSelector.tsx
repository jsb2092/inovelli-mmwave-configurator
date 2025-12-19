import { HADevice } from '../types';

interface DeviceSelectorProps {
  devices: HADevice[];
  selectedDevice: HADevice | null;
  onSelectDevice: (device: HADevice) => void;
  onRefresh: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

export function DeviceSelector({
  devices,
  selectedDevice,
  onSelectDevice,
  onRefresh,
  isConnected,
  isLoading,
}: DeviceSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <select
          value={selectedDevice?.id || ''}
          onChange={(e) => {
            const device = devices.find((d) => d.id === e.target.value);
            if (device) onSelectDevice(device);
          }}
          disabled={!isConnected || devices.length === 0}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
        >
          {!isConnected ? (
            <option value="">Not connected to Home Assistant</option>
          ) : devices.length === 0 ? (
            <option value="">No VZM32-SN devices found</option>
          ) : (
            <>
              <option value="">Select a device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                  {device.area ? ` (${device.area})` : ''}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
      <button
        onClick={onRefresh}
        disabled={!isConnected || isLoading}
        className="p-2 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Refresh devices"
      >
        <svg
          className={`w-5 h-5 text-slate-300 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
