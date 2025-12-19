import { ZoneBounds, DetectionSettings, UnitSystem, SENSITIVITY_LABELS, DELAY_LABELS, cmToInches, inchesToCm } from '../types';
import { NumberInput } from './NumberInput';

interface ZoneControlsProps {
  zone: ZoneBounds;
  detection: DetectionSettings;
  onZoneChange: (zone: ZoneBounds) => void;
  onDetectionChange: (detection: DetectionSettings) => void;
  units: UnitSystem;
}

export function ZoneControls({ zone, detection, onZoneChange, onDetectionChange, units }: ZoneControlsProps) {
  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'in' : 'cm';

  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm) * 10) / 10 : cm;
  const fromDisplay = (value: number) => isImperial ? inchesToCm(value) : value;

  const handleZoneChange = (field: keyof ZoneBounds, value: number) => {
    onZoneChange({ ...zone, [field]: Math.round(fromDisplay(value)) });
  };

  const handleHoldTimeChange = (value: number) => {
    onDetectionChange({ ...detection, holdTime: Math.max(1, Math.min(300, value)) });
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      {/* Zone Bounds */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Zone Bounds ({unitLabel})</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">X Min (Left)</label>
            <NumberInput
              value={toDisplay(zone.xMin)}
              onChange={(v) => handleZoneChange('xMin', v)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">X Max (Right)</label>
            <NumberInput
              value={toDisplay(zone.xMax)}
              onChange={(v) => handleZoneChange('xMax', v)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Y Min (Near)</label>
            <NumberInput
              value={toDisplay(zone.yMin)}
              onChange={(v) => handleZoneChange('yMin', v)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Y Max (Far)</label>
            <NumberInput
              value={toDisplay(zone.yMax)}
              onChange={(v) => handleZoneChange('yMax', v)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Z Min (Floor)</label>
            <NumberInput
              value={toDisplay(zone.zMin)}
              onChange={(v) => handleZoneChange('zMin', v)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Z Max (Ceiling)</label>
            <NumberInput
              value={toDisplay(zone.zMax)}
              onChange={(v) => handleZoneChange('zMax', v)}
              className={inputClass}
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
