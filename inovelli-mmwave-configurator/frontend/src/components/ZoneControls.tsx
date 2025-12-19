import { ZoneBounds, DetectionSettings, SENSITIVITY_LABELS, DELAY_LABELS } from '../types';

interface ZoneControlsProps {
  zone: ZoneBounds;
  detection: DetectionSettings;
  onZoneChange: (zone: ZoneBounds) => void;
  onDetectionChange: (detection: DetectionSettings) => void;
}

export function ZoneControls({ zone, detection, onZoneChange, onDetectionChange }: ZoneControlsProps) {
  const handleZoneChange = (field: keyof ZoneBounds, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      onZoneChange({ ...zone, [field]: numValue });
    }
  };

  const handleHoldTimeChange = (value: number) => {
    onDetectionChange({ ...detection, holdTime: Math.max(1, Math.min(300, value)) });
  };

  return (
    <div className="space-y-4">
      {/* Zone Bounds */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Zone Bounds (cm)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">X Min (Left)</label>
            <input
              type="number"
              value={zone.xMin}
              onChange={(e) => handleZoneChange('xMin', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">X Max (Right)</label>
            <input
              type="number"
              value={zone.xMax}
              onChange={(e) => handleZoneChange('xMax', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Y Min (Near)</label>
            <input
              type="number"
              value={zone.yMin}
              onChange={(e) => handleZoneChange('yMin', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Y Max (Far)</label>
            <input
              type="number"
              value={zone.yMax}
              onChange={(e) => handleZoneChange('yMax', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Z Min (Floor)</label>
            <input
              type="number"
              value={zone.zMin}
              onChange={(e) => handleZoneChange('zMin', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Z Max (Ceiling)</label>
            <input
              type="number"
              value={zone.zMax}
              onChange={(e) => handleZoneChange('zMax', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Detection Settings */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Detection Settings</h3>

        {/* Sensitivity */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Sensitivity</label>
          <div className="flex gap-2">
            {SENSITIVITY_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => onDetectionChange({ ...detection, sensitivity: index as 0 | 1 | 2 })}
                className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                  detection.sensitivity === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Detection Delay */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Detection Delay</label>
          <div className="flex gap-2">
            {DELAY_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => onDetectionChange({ ...detection, delay: index as 0 | 1 | 2 })}
                className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                  detection.delay === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hold Time */}
        <div>
          <label className="block text-xs text-slate-400 mb-2">
            Hold Time: {detection.holdTime}s
          </label>
          <input
            type="range"
            min="1"
            max="300"
            value={detection.holdTime}
            onChange={(e) => handleHoldTimeChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1s</span>
            <span>300s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
