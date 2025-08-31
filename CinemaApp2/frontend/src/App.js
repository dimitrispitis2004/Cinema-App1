import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('');
  const [reservations, setReservations] = useState([]);

  const backend = 'http://localhost:5000'; // localhost για PC, 10.0.2.2 για emulator

  // Signup
  const signup = async () => {
    try {
      await axios.post(`${backend}/auth/register`, { name: 'Test', email, password });
      alert('User registered');
    } catch (e) {
      alert(e.response?.data?.message || 'Signup failed');
    }
  };

  // Login
  const login = async () => {
    try {
      const res = await axios.post(`${backend}/auth/login`, { email, password });
      setToken(res.data.token);
      alert('Logged in');
      fetchCinemas(res.data.token);
      fetchReservations(res.data.token);
    } catch (e) {
      alert(e.response?.data?.message || 'Login failed');
    }
  };

  // Fetch cinemas
  const fetchCinemas = async (jwt) => {
    try {
      const res = await axios.get(`${backend}/cinemas`, { headers: { Authorization: `Bearer ${jwt}` } });
      if (res.data.length === 0) {
        alert('No cinemas found. Add some in the database!');
      }
      setCinemas(res.data);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to fetch cinemas');
    }
  };

  // Fetch movies for cinema
  const fetchMovies = async (cinemaId) => {
    setSelectedCinema(cinemaId);
    try {
      const res = await axios.get(`${backend}/movies/${cinemaId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMovies(res.data);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to fetch movies');
    }
  };

  // Fetch reservations
  const fetchReservations = async (jwt) => {
    try {
      const res = await axios.get(`${backend}/user/reservations`, { headers: { Authorization: `Bearer ${jwt}` } });
      setReservations(res.data);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to fetch reservations');
    }
  };

  // Create reservation
  const createReservation = async () => {
    if (!selectedMovie) return alert('Select a movie');
    try {
      await axios.post(`${backend}/reservations`, {
        movie_id: selectedMovie,
        cinema_id: selectedCinema,
        date,
        time,
        seat_numbers: seats
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Reservation created');
      fetchReservations(token);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create reservation');
    }
  };

  return (
    <div className="container">
      {!token ? (
        <div>
          <h2>Signup / Login</h2>
          <div>Email:</div>
          <input value={email} onChange={e => setEmail(e.target.value)} />
          <div>Password:</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={signup}>Signup</button>
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <h2>Cinemas:</h2>
          {cinemas.length === 0 ? <p>No cinemas available</p> :
            <ul>
              {cinemas.map(cinema => (
                <li key={cinema.cinema_id} onClick={() => fetchMovies(cinema.cinema_id)}>
                  {cinema.name} - {cinema.location}
                </li>
              ))}
            </ul>
          }

          {selectedCinema && (
            <div>
              <h3>Movies:</h3>
              {movies.length === 0 ? <p>No movies for this cinema</p> :
                <ul>
                  {movies.map(movie => (
                    <li key={movie.movie_id} onClick={() => setSelectedMovie(movie.movie_id)}>
                      {movie.title} ({movie.duration} min)
                    </li>
                  ))}
                </ul>
              }

              {selectedMovie && (
                <div>
                  <input placeholder="Date (YYYY-MM-DD)" value={date} onChange={e => setDate(e.target.value)} />
                  <input placeholder="Time (HH:MM)" value={time} onChange={e => setTime(e.target.value)} />
                  <input placeholder="Seats (e.g. A1,A2)" value={seats} onChange={e => setSeats(e.target.value)} />
                  <button onClick={createReservation}>Reserve</button>
                </div>
              )}
            </div>
          )}

          {reservations.length > 0 && (
            <div>
              <h3>My Reservations:</h3>
              <ul>
                {reservations.map(r => (
                  <li key={r.reservation_id}>
                    Movie: {r.movie_title || r.movie_id}, Cinema: {r.cinema_name || r.cinema_id}, Date: {r.date}, Time: {r.time}, Seats: {r.seat_numbers}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
