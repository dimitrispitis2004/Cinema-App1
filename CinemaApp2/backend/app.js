const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mariadb = require('mariadb');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = 'your_secret_key';

// MariaDB pool
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',      
  password: '',      
  database: 'cinema_db'
});

// ----------------- Middleware -----------------
async function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// ----------------- Routes -----------------

// Register
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = bcrypt.hashSync(password, 8);
  try {
    const conn = await pool.getConnection();
    await conn.query('INSERT INTO users (name,email,password) VALUES (?, ?, ?)', [name,email,hashed]);
    conn.release();
    res.json({ message: 'User registered' });
  } catch(err) {
    res.status(400).json({ message: err.message });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    conn.release();
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ user_id: user.user_id, email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Get cinemas
app.get('/cinemas', auth, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const cinemas = await conn.query('SELECT * FROM cinemas');
    conn.release();
    res.json(cinemas);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Get movies by cinema
app.get('/movies/:cinemaId', auth, async (req, res) => {
  const cinemaId = parseInt(req.params.cinemaId);
  try {
    const conn = await pool.getConnection();
    const movies = await conn.query('SELECT * FROM movies WHERE cinema_id = ?', [cinemaId]);
    conn.release();
    res.json(movies);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Create reservation με validation
app.post('/reservations', auth, async (req, res) => {
  const { movie_id, cinema_id, date, time, seat_numbers } = req.body;

  // Validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const seatsRegex = /^([A-Z]\d+)(,[A-Z]\d+)*$/;
  if (!dateRegex.test(date)) return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  if (!timeRegex.test(time)) return res.status(400).json({ message: 'Invalid time format. Use HH:MM 24-hour' });
  if (!seatsRegex.test(seat_numbers)) return res.status(400).json({ message: 'Invalid seats format. Use format like A1,B2' });

  try {
    const conn = await pool.getConnection();

    // Έλεγχος αν υπάρχει η ταινία στο συγκεκριμένο cinema
    const movieCheck = await conn.query('SELECT * FROM movies WHERE movie_id=? AND cinema_id=?', [movie_id, cinema_id]);
    if (!movieCheck[0]) {
      conn.release();
      return res.status(400).json({ message: 'Invalid movie or cinema ID' });
    }

    await conn.query(
      'INSERT INTO reservations (user_id, movie_id, cinema_id, date, time, seat_numbers) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.user_id, movie_id, cinema_id, date, time, seat_numbers]
    );
    conn.release();
    res.json({ message: 'Reservation created' });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Get reservations for logged-in user
app.get('/user/reservations', auth, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const reservations = await conn.query(`
      SELECT r.*, m.title AS movie_title, c.name AS cinema_name
      FROM reservations r
      JOIN movies m ON r.movie_id = m.movie_id
      JOIN cinemas c ON r.cinema_id = c.cinema_id
      WHERE r.user_id = ?`, [req.user.user_id]
    );
    conn.release();
    res.json(reservations);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
app.listen(5000, () => console.log('Server running on port 5000'));
