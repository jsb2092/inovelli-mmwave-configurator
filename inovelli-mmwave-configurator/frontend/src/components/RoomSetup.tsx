import { RoomDimensions } from '../types';

interface RoomSetupProps {
  room: RoomDimensions;
  onChange: (room: RoomDimensions) => void;
}

export function RoomSetup({ room, onChange }: RoomSetupProps) {
  const handleChange = (field: keyof RoomDimensions, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      onChange({ ...room, [field]: numValue });
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Room Dimensions</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Width (cm)</label>
          <input
            type="number"
            value={room.width}
            onChange={(e) => handleChange('width', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Depth (cm)</label>
          <input
            type="number"
            value={room.depth}
            onChange={(e) => handleChange('depth', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Height (cm)</label>
          <input
            type="number"
            value={room.height}
            onChange={(e) => handleChange('height', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Sensor Height (cm)</label>
          <input
            type="number"
            value={room.sensorHeight}
            onChange={(e) => handleChange('sensorHeight', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">
            Sensor Position from Left Wall: {room.sensorX} cm
          </label>
          <input
            type="range"
            min="0"
            max={room.width}
            value={room.sensorX}
            onChange={(e) => handleChange('sensorX', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Left (0)</span>
            <span>Center ({Math.round(room.width / 2)})</span>
            <span>Right ({room.width})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
