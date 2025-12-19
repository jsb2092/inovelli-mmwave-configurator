const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Database setup - stored in /data for persistence in Home Assistant
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'mmwave-config.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;

async function initDb() {
  const SQL = await initSqlJs();

  console.log(`Database path: ${DB_PATH}`);
  console.log(`Data directory exists: ${fs.existsSync(DATA_DIR)}`);
  console.log(`Database file exists: ${fs.existsSync(DB_PATH)}`);

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    console.log('Loading existing database...');
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('Database loaded successfully');
  } else {
    console.log('Creating new database...');
    db = new SQL.Database();
  }

  // Initialize database tables
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      depth INTEGER NOT NULL,
      height INTEGER NOT NULL,
      sensor_x INTEGER NOT NULL,
      sensor_height INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
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
    )
  `);

  saveDb();

  // Log database contents on startup
  const roomCount = queryAll('SELECT COUNT(*) as count FROM rooms')[0]?.count || 0;
  const settingsCount = queryAll('SELECT COUNT(*) as count FROM settings')[0]?.count || 0;
  console.log(`Database initialized: ${roomCount} rooms, ${settingsCount} settings`);

  if (roomCount > 0) {
    const rooms = queryAll('SELECT id, name, width, depth, height, sensor_x, sensor_height FROM rooms');
    console.log('Existing rooms:', JSON.stringify(rooms));
  }
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  const result = db.exec("SELECT last_insert_rowid()");
  return { lastInsertRowid: result[0]?.values[0]?.[0] };
}

// Settings API
app.get('/api/settings/:key', (req, res) => {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', [req.params.key]);
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
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [req.params.key, value]);
  res.json({ success: true });
});

// Rooms API
app.get('/api/rooms', (req, res) => {
  const rooms = queryAll('SELECT * FROM rooms ORDER BY updated_at DESC');
  console.log(`GET /api/rooms: returning ${rooms.length} rooms`);
  res.json(rooms);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = queryOne('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const obstacles = queryAll('SELECT * FROM obstacles WHERE room_id = ?', [req.params.id]);
  const furniture = queryAll('SELECT * FROM furniture WHERE room_id = ?', [req.params.id]);

  res.json({ ...room, obstacles, furniture });
});

app.post('/api/rooms', (req, res) => {
  const { name, width, depth, height, sensor_x, sensor_height } = req.body;
  console.log(`POST /api/rooms: creating room`, { name, width, depth, height, sensor_x, sensor_height });
  const result = run(`
    INSERT INTO rooms (name, width, depth, height, sensor_x, sensor_height)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name || 'New Room', width || 400, depth || 500, height || 244, sensor_x || 200, sensor_height || 100]);

  console.log(`POST /api/rooms: created room with id ${result.lastInsertRowid}`);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/rooms/:id', (req, res) => {
  const { name, width, depth, height, sensor_x, sensor_height, obstacles, furniture: furnitureItems } = req.body;
  console.log(`PUT /api/rooms/${req.params.id}:`, { name, width, depth, height, sensor_x, sensor_height });

  run(`
    UPDATE rooms SET name = ?, width = ?, depth = ?, height = ?, sensor_x = ?, sensor_height = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [name, width, depth, height, sensor_x, sensor_height, req.params.id]);

  // Update obstacles if provided
  if (obstacles) {
    run('DELETE FROM obstacles WHERE room_id = ?', [req.params.id]);
    for (const obs of obstacles) {
      run(`
        INSERT INTO obstacles (room_id, type, name, x1, y1, x2, y2, z_min, z_max)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [req.params.id, obs.type, obs.name, obs.x1, obs.y1, obs.x2, obs.y2, obs.zMin, obs.zMax]);
    }
  }

  // Update furniture if provided
  if (furnitureItems) {
    run('DELETE FROM furniture WHERE room_id = ?', [req.params.id]);
    for (const item of furnitureItems) {
      run(`
        INSERT INTO furniture (room_id, type, name, x, y, width, depth, height, rotation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [req.params.id, item.type, item.name, item.x, item.y, item.width, item.depth, item.height, item.rotation || 0]);
    }
  }

  res.json({ success: true });
});

app.delete('/api/rooms/:id', (req, res) => {
  run('DELETE FROM obstacles WHERE room_id = ?', [req.params.id]);
  run('DELETE FROM furniture WHERE room_id = ?', [req.params.id]);
  run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 8099;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
