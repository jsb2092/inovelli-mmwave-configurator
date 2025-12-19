export interface RoomDimensions {
  width: number;  // cm
  depth: number;  // cm
  height: number; // cm
  sensorHeight: number; // cm from floor
  sensorX: number; // cm from left wall (0 = left edge, width = right edge)
}

export interface ZoneBounds {
  xMin: number; // left boundary (negative = left of sensor)
  xMax: number; // right boundary (positive = right of sensor)
  yMin: number; // near boundary (0 = at sensor)
  yMax: number; // far boundary
  zMin: number; // floor boundary (negative = below sensor)
  zMax: number; // ceiling boundary (positive = above sensor)
}

export interface DetectionSettings {
  sensitivity: 0 | 1 | 2; // 0=Low, 1=Medium, 2=High
  delay: 0 | 1 | 2;       // 0=5s, 1=1s, 2=0.2s
  holdTime: number;       // seconds (1-300)
}

export interface DeviceConfig {
  room: RoomDimensions;
  zone: ZoneBounds;
  detection: DetectionSettings;
}

export interface HADevice {
  id: string;
  name: string;
  areaName?: string;  // Room/area name from Home Assistant
  entities: {
    xMin: string;
    xMax: string;
    yMin: string;
    yMax: string;
    zMin: string;
    zMax: string;
    sensitivity: string;
    delay: string;
    holdTime: string;
  };
}

export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export const SENSITIVITY_LABELS = ['Low', 'Medium', 'High'] as const;
export const DELAY_LABELS = ['5s', '1s', '0.2s'] as const;

export type UnitSystem = 'metric' | 'imperial';

// Conversion helpers
export const CM_PER_INCH = 2.54;

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export const DEFAULT_ROOM: RoomDimensions = {
  width: 400,
  depth: 500,
  height: 280,
  sensorHeight: 120,
  sensorX: 200, // centered by default (width / 2)
};

export const DEFAULT_ZONE: ZoneBounds = {
  xMin: -150,
  xMax: 150,
  yMin: 0,
  yMax: 400,
  zMin: -100,
  zMax: 160,
};

export const DEFAULT_DETECTION: DetectionSettings = {
  sensitivity: 1,
  delay: 1,
  holdTime: 30,
};

// Target tracking (detected people/objects)
export interface Target {
  id: number;
  x: number;  // cm relative to sensor
  y: number;  // cm depth from sensor
  z: number;  // cm height relative to sensor
  speed?: number;  // velocity
  active: boolean;
}

// Room obstacles (walls, exclusion zones)
export interface RoomObstacle {
  id: string;
  type: 'wall' | 'exclusion';
  name: string;
  // Top-down bounds
  x1: number;  // cm from left wall
  y1: number;  // cm depth from sensor wall
  x2: number;
  y2: number;
  // Height bounds (optional - full height if not specified)
  zMin?: number;
  zMax?: number;
}

// Furniture items
export interface FurnitureItem {
  id: string;
  type: 'couch' | 'bed' | 'desk' | 'table' | 'chair' | 'tv' | 'custom';
  name: string;
  x: number;  // cm from left wall (center point)
  y: number;  // cm depth from sensor wall (center point)
  width: number;  // cm
  depth: number;  // cm
  height: number; // cm
  rotation: number; // degrees
}

export const FURNITURE_PRESETS: Record<string, { width: number; depth: number; height: number }> = {
  couch: { width: 200, depth: 90, height: 85 },
  bed: { width: 150, depth: 200, height: 55 },
  desk: { width: 120, depth: 60, height: 75 },
  table: { width: 180, depth: 90, height: 75 },
  chair: { width: 50, depth: 50, height: 90 },
  tv: { width: 120, depth: 10, height: 70 },
  custom: { width: 100, depth: 100, height: 100 },
};
