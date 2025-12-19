import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Database setup - stored in /data for persistence in Home Assistant
const DATA_DIR = process.env.DATA_DIR || '/data';
const db = new Database(join(DATA_DIR, 'mmwave-config.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    depth INTEGER NOT NULL,
    height INTEGER NOT NULL,
    sensor_x INTEGER NOT NULL,
    sensor_height INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS obstacles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    x1 INTEGER NOT NULL,
    y1 INTEGER NOT NULL,
    x2 INTEGER NOT NULL,
    y2 INTEGER NOT NULL,
    z_min INTEGER,
    z_max INTEGER,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS furniture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    depth INTEGER NOT NULL,
    height INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
`);

// Settings API
app.get('/api/settings/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (row) {
    try {
      res.json(JSON.parse(row.value));
    } catch {
      res.json(row.value);
    }
  } else {
    res.status(404).json({ error: 'Setting not found' });
  }
});

app.put('/api/settings/:key', (req, res) => {
  const value = JSON.stringify(req.body);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, value);
  res.json({ success: true });
});

// Rooms API
app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY updated_at DESC').all();
  res.json(rooms);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const obstacles = db.prepare('SELECT * FROM obstacles WHERE room_id = ?').all(req.params.id);
  const furniture = db.prepare('SELECT * FROM furniture WHERE room_id = ?').all(req.params.id);

  res.json({ ...room, obstacles, furniture });
});

app.post('/api/rooms', (req, res) => {
  const { name, width, depth, height, sensor_x, sensor_height } = req.body;
  const result = db.prepare(`
    INSERT INTO rooms (name, width, depth, height, sensor_x, sensor_height)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name || 'New Room', width || 400, depth || 500, height || 244, sensor_x || 200, sensor_height || 100);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/rooms/:id', (req, res) => {
  const { name, width, depth, height, sensor_x, sensor_height, obstacles, furniture: furnitureItems } = req.body;

  db.prepare(`
    UPDATE rooms SET name = ?, width = ?, depth = ?, height = ?, sensor_x = ?, sensor_height = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, width, depth, height, sensor_x, sensor_height, req.params.id);

  // Update obstacles if provided
  if (obstacles) {
    db.prepare('DELETE FROM obstacles WHERE room_id = ?').run(req.params.id);
    const insertObstacle = db.prepare(`
      INSERT INTO obstacles (room_id, type, name, x1, y1, x2, y2, z_min, z_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const obs of obstacles) {
      insertObstacle.run(req.params.id, obs.type, obs.name, obs.x1, obs.y1, obs.x2, obs.y2, obs.zMin, obs.zMax);
    }
  }

  // Update furniture if provided
  if (furnitureItems) {
    db.prepare('DELETE FROM furniture WHERE room_id = ?').run(req.params.id);
    const insertFurniture = db.prepare(`
      INSERT INTO furniture (room_id, type, name, x, y, width, depth, height, rotation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of furnitureItems) {
      insertFurniture.run(req.params.id, item.type, item.name, item.x, item.y, item.width, item.depth, item.height, item.rotation || 0);
    }
  }

  res.json({ success: true });
});

app.delete('/api/rooms/:id', (req, res) => {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Serve static frontend files
app.use(express.static(join(__dirname, '../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 8099;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
