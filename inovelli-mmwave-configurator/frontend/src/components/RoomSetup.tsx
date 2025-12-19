import { RoomDimensions, UnitSystem, cmToInches, inchesToCm, SensorPosition } from '../types';
import { NumberInput } from './NumberInput';

interface RoomSetupProps {
  room: RoomDimensions;
  onChange: (room: RoomDimensions) => void;
  units: UnitSystem;
  // Per-device sensor position editing
  sensorPosition?: SensorPosition;
  onSensorPositionChange?: (position: SensorPosition) => void;
  selectedDeviceName?: string;
}

export function RoomSetup({
  room, onChange, units, sensorPosition, onSensorPositionChange, selectedDeviceName
}: RoomSetupProps) {
  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'in' : 'cm';

  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm) * 10) / 10 : cm;
  const fromDisplay = (value: number) => isImperial ? inchesToCm(value) : value;

  const handleChange = (field: keyof RoomDimensions, value: number) => {
    onChange({ ...room, [field]: Math.round(fromDisplay(value)) });
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500";
  const selectClass = "w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500";

  // Get max position based on wall
  const getMaxPosition = () => {
    if (!sensorPosition) return room.width;
    return (sensorPosition.wall === 'top' || sensorPosition.wall === 'bottom')
      ? room.width
      : room.depth;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Room Dimensions</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Width ({unitLabel})</label>
          <NumberInput
            value={toDisplay(room.width)}
            onChange={(v) => handleChange('width', v)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Depth ({unitLabel})</label>
          <NumberInput
            value={toDisplay(room.depth)}
            onChange={(v) => handleChange('depth', v)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Height ({unitLabel})</label>
          <NumberInput
            value={toDisplay(room.height)}
            onChange={(v) => handleChange('height', v)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Sensor Position Section - only show if we have a selected device */}
      {sensorPosition && onSensorPositionChange && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-amber-400 mb-3">
            {selectedDeviceName || 'Sensor'} Position
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wall</label>
              <select
                value={sensorPosition.wall}
                onChange={(e) => onSensorPositionChange({
                  ...sensorPosition,
                  wall: e.target.value as SensorPosition['wall'],
                  position: Math.min(sensorPosition.position, getMaxPosition()),
                })}
                className={selectClass}
              >
                <option value="top">Top</option>
                <option value="right">Right</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height ({unitLabel})</label>
              <NumberInput
                value={toDisplay(sensorPosition.height)}
                onChange={(v) => onSensorPositionChange({
                  ...sensorPosition,
                  height: Math.round(fromDisplay(v)),
                })}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                Position along wall: {toDisplay(sensorPosition.position)} {unitLabel}
              </label>
              <input
                type="range"
                min="0"
                max={getMaxPosition()}
                value={sensorPosition.position}
                onChange={(e) => onSensorPositionChange({
                  ...sensorPosition,
                  position: parseInt(e.target.value, 10),
                })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
