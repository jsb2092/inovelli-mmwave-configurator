import { RoomDimensions, UnitSystem, cmToInches, inchesToCm } from '../types';
import { NumberInput } from './NumberInput';

interface RoomSetupProps {
  room: RoomDimensions;
  onChange: (room: RoomDimensions) => void;
  units: UnitSystem;
}

export function RoomSetup({ room, onChange, units }: RoomSetupProps) {
  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'in' : 'cm';

  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm) * 10) / 10 : cm;
  const fromDisplay = (value: number) => isImperial ? inchesToCm(value) : value;

  const handleChange = (field: keyof RoomDimensions, value: number) => {
    onChange({ ...room, [field]: Math.round(fromDisplay(value)) });
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500";

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
        <div>
          <label className="block text-xs text-slate-400 mb-1">Sensor Height ({unitLabel})</label>
          <NumberInput
            value={toDisplay(room.sensorHeight)}
            onChange={(v) => handleChange('sensorHeight', v)}
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">
            Sensor from Left: {toDisplay(room.sensorX)} {unitLabel}
          </label>
          <input
            type="range"
            min="0"
            max={room.width}
            value={room.sensorX}
            onChange={(e) => onChange({ ...room, sensorX: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Left</span>
            <span>Center</span>
            <span>Right</span>
          </div>
        </div>
      </div>
    </div>
  );
}
