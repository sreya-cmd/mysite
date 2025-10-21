const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const DBSOURCE = 'aqua.db';
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  }
  console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullname TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    price_inr REAL,
    date TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS feed_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT,
    daily_feed_kg REAL,
    optimal_feed_kg REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS env_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric TEXT,
    value REAL,
    recorded_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite' }),
  secret: 'replace_with_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', async (req, res) => {
  const { username, password, fullname } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hashed = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)');
  stmt.run(username, hashed, fullname || null, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
      return res.status(500).json({ error: err.message });
    }
    req.session.userId = this.lastID;
    res.json({ success: true, userId: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = row.id;
    res.json({ success: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/feed/calc', requireAuth, (req, res) => {
  let { avgWeight, feedRatePercent, numberOfFish } = req.body;
  avgWeight = Number(avgWeight);
  feedRatePercent = Number(feedRatePercent);
  numberOfFish = Number(numberOfFish);
  if (![avgWeight, feedRatePercent, numberOfFish].every(v => isFinite(v))) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const feedPerDay_grams = avgWeight * (feedRatePercent / 100) * numberOfFish;
  res.json({ feedPerDay_grams, feedPerDay_kgs: feedPerDay_grams / 1000 });
});

app.get('/api/trends', requireAuth, (req, res) => {
  db.all('SELECT day, daily_feed_kg, optimal_feed_kg FROM feed_trends ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      const sample = [
        { day: 'Day 1', daily_feed_kg: 5, optimal_feed_kg: 6 },
        { day: 'Day 2', daily_feed_kg: 12, optimal_feed_kg: 12 },
        { day: 'Day 3', daily_feed_kg: 20, optimal_feed_kg: 22 },
        { day: 'Day 4', daily_feed_kg: 18, optimal_feed_kg: 20 },
        { day: 'Day 5', daily_feed_kg: 28, optimal_feed_kg: 30 },
      ];
      return res.json(sample);
    }
    res.json(rows);
  });
});

app.get('/api/env', requireAuth, (req, res) => {
  db.all('SELECT metric, value FROM env_metrics ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || !rows.length) {
      return res.json([
        { metric: 'Water Quality Index', value: 45 },
        { metric: 'Temperature (°C)', value: 28 },
        { metric: 'pH', value: 7.5 }
      ]);
    }
    res.json(rows);
  });
});

app.get('/api/market', requireAuth, (req, res) => {
  db.all('SELECT item, price_inr, date FROM market_prices ORDER BY date DESC LIMIT 20', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || !rows.length) {
      return res.json([
        { item: 'Rohu (per kg)', price_inr: 210 },
        { item: 'Catla (per kg)', price_inr: 230 },
        { item: 'Tiger Shrimp (per kg)', price_inr: 520 }
      ]);
    }
    res.json(rows);
  });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
