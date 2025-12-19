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
  area?: string;
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
