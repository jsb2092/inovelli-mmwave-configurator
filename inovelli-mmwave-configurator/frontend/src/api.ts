// API helper for communicating with the backend

const API_BASE = '/api';

export async function getSetting<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/settings/${key}`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSetting<T>(key: string, value: T): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ObstacleRecord {
  id?: number;
  type: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z_min?: number;
  z_max?: number;
  zMin?: number;
  zMax?: number;
}

export interface FurnitureRecord {
  id?: number;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
}

export interface RoomRecord {
  id: number;
  name: string;
  width: number;
  depth: number;
  height: number;
  sensor_x: number;
  sensor_height: number;
  obstacles?: ObstacleRecord[];
  furniture?: FurnitureRecord[];
}

export async function getRooms(): Promise<RoomRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}

export async function getRoom(id: number): Promise<RoomRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${id}`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export async function createRoom(room: Partial<RoomRecord>): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    if (res.ok) {
      const data = await res.json();
      return data.id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRoom(id: number, room: Partial<RoomRecord>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteRoom(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}
