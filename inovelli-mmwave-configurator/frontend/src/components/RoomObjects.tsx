import { useState } from 'react';
import { RoomObstacle, FurnitureItem, UnitSystem, cmToInches, inchesToCm, FURNITURE_PRESETS } from '../types';
import { NumberInput } from './NumberInput';

interface RoomObjectsProps {
  obstacles: RoomObstacle[];
  furniture: FurnitureItem[];
  onObstaclesChange: (obstacles: RoomObstacle[]) => void;
  onFurnitureChange: (furniture: FurnitureItem[]) => void;
  units: UnitSystem;
}

export function RoomObjects({
  obstacles,
  furniture,
  onObstaclesChange,
  onFurnitureChange,
  units,
}: RoomObjectsProps) {
  const [showAddObstacle, setShowAddObstacle] = useState(false);
  const [showAddFurniture, setShowAddFurniture] = useState(false);

  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'in' : 'cm';
  const toDisplay = (cm: number) => (isImperial ? Math.round(cmToInches(cm) * 10) / 10 : cm);
  const fromDisplay = (value: number) => (isImperial ? inchesToCm(value) : value);

  const addObstacle = (type: 'wall' | 'exclusion') => {
    const newObstacle: RoomObstacle = {
      id: `obstacle-${Date.now()}`,
      type,
      name: type === 'wall' ? 'Wall' : 'Exclusion Zone',
      x1: 50,
      y1: 100,
      x2: 100,
      y2: 150,
    };
    onObstaclesChange([...obstacles, newObstacle]);
    setShowAddObstacle(false);
  };

  const removeObstacle = (id: string) => {
    onObstaclesChange(obstacles.filter((o) => o.id !== id));
  };

  const updateObstacle = (id: string, updates: Partial<RoomObstacle>) => {
    onObstaclesChange(
      obstacles.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const addFurniture = (type: keyof typeof FURNITURE_PRESETS) => {
    const preset = FURNITURE_PRESETS[type];
    const newItem: FurnitureItem = {
      id: `furniture-${Date.now()}`,
      type: type as FurnitureItem['type'],
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x: 200,
      y: 250,
      width: preset.width,
      depth: preset.depth,
      height: preset.height,
      rotation: 0,
    };
    onFurnitureChange([...furniture, newItem]);
    setShowAddFurniture(false);
  };

  const removeFurniture = (id: string) => {
    onFurnitureChange(furniture.filter((f) => f.id !== id));
  };

  const updateFurniture = (id: string, updates: Partial<FurnitureItem>) => {
    onFurnitureChange(
      furniture.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const smallInputClass = "w-full bg-slate-700 rounded px-1 py-0.5 text-white text-xs";

  return (
    <div className="space-y-4">
      {/* Obstacles Section */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Obstacles</h3>
          <button
            onClick={() => setShowAddObstacle(!showAddObstacle)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            + Add
          </button>
        </div>

        {showAddObstacle && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => addObstacle('wall')}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 rounded text-white"
            >
              Wall
            </button>
            <button
              onClick={() => addObstacle('exclusion')}
              className="flex-1 px-3 py-1.5 text-xs bg-red-600/50 hover:bg-red-600/70 rounded text-white"
            >
              Exclusion Zone
            </button>
          </div>
        )}

        {obstacles.length === 0 ? (
          <p className="text-xs text-slate-500">No obstacles added</p>
        ) : (
          <div className="space-y-2">
            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                className={`p-2 rounded border ${
                  obstacle.type === 'wall'
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-red-900/20 border-red-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={obstacle.name}
                    onChange={(e) =>
                      updateObstacle(obstacle.id, { name: e.target.value })
                    }
                    className="bg-transparent text-sm text-white font-medium focus:outline-none border-b border-transparent focus:border-slate-500"
                  />
                  <button
                    onClick={() => removeObstacle(obstacle.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-slate-500">X1</label>
                    <NumberInput
                      value={toDisplay(obstacle.x1)}
                      onChange={(v) =>
                        updateObstacle(obstacle.id, { x1: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">Y1</label>
                    <NumberInput
                      value={toDisplay(obstacle.y1)}
                      onChange={(v) =>
                        updateObstacle(obstacle.id, { y1: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">X2</label>
                    <NumberInput
                      value={toDisplay(obstacle.x2)}
                      onChange={(v) =>
                        updateObstacle(obstacle.id, { x2: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">Y2</label>
                    <NumberInput
                      value={toDisplay(obstacle.y2)}
                      onChange={(v) =>
                        updateObstacle(obstacle.id, { y2: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Furniture Section */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Furniture</h3>
          <button
            onClick={() => setShowAddFurniture(!showAddFurniture)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            + Add
          </button>
        </div>

        {showAddFurniture && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {Object.keys(FURNITURE_PRESETS).map((type) => (
              <button
                key={type}
                onClick={() => addFurniture(type as keyof typeof FURNITURE_PRESETS)}
                className="px-2 py-1.5 text-xs bg-purple-600/50 hover:bg-purple-600/70 rounded text-white capitalize"
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {furniture.length === 0 ? (
          <p className="text-xs text-slate-500">No furniture added</p>
        ) : (
          <div className="space-y-2">
            {furniture.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded bg-purple-900/20 border border-purple-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateFurniture(item.id, { name: e.target.value })
                    }
                    className="bg-transparent text-sm text-white font-medium focus:outline-none border-b border-transparent focus:border-purple-500"
                  />
                  <button
                    onClick={() => removeFurniture(item.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <label className="text-slate-500">X ({unitLabel})</label>
                    <NumberInput
                      value={toDisplay(item.x)}
                      onChange={(v) =>
                        updateFurniture(item.id, { x: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">Y ({unitLabel})</label>
                    <NumberInput
                      value={toDisplay(item.y)}
                      onChange={(v) =>
                        updateFurniture(item.id, { y: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">Rotation</label>
                    <NumberInput
                      value={item.rotation}
                      onChange={(v) =>
                        updateFurniture(item.id, { rotation: Math.round(v) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-slate-500">W ({unitLabel})</label>
                    <NumberInput
                      value={toDisplay(item.width)}
                      onChange={(v) =>
                        updateFurniture(item.id, { width: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">D ({unitLabel})</label>
                    <NumberInput
                      value={toDisplay(item.depth)}
                      onChange={(v) =>
                        updateFurniture(item.id, { depth: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">H ({unitLabel})</label>
                    <NumberInput
                      value={toDisplay(item.height)}
                      onChange={(v) =>
                        updateFurniture(item.id, { height: Math.round(fromDisplay(v)) })
                      }
                      className={smallInputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
