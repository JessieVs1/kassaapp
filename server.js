const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.LOCAL ? false : { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/producten', async (req, res) => {
  const result = await pool.query('SELECT * FROM producten ORDER BY id');
  res.json(result.rows);
});

app.put('/producten/:id', async (req, res) => {
  await pool.query('UPDATE producten SET voorraad = voorraad + 1 WHERE id = $1', [req.params.id]);
  res.sendStatus(200);
});

app.post('/bestel', async (req, res) => {
  const { gebruiker, product_id } = req.body;
  const product = await pool.query('SELECT * FROM producten WHERE id = $1', [product_id]);
  if (product.rows.length === 0 || product.rows[0].voorraad <= 0) {
    return res.json({ message: 'Niet op voorraad' });
  }
  await pool.query('UPDATE producten SET voorraad = voorraad - 1 WHERE id = $1', [product_id]);
  await pool.query('INSERT INTO logs (gebruiker, product, tijd) VALUES ($1, $2, NOW())', [
    gebruiker, product.rows[0].naam
  ]);
  res.json({ message: 'Bestelling geplaatst!' });
});

app.get('/logs', async (req, res) => {
  const result = await pool.query('SELECT * FROM logs ORDER BY tijd DESC');
  res.json(result.rows);
});

app.delete('/logs', async (req, res) => {
  await pool.query('DELETE FROM logs');
  res.sendStatus(200);
});

app.get('/gebruikers', async (req, res) => {
  const result = await pool.query('SELECT * FROM gebruikers ORDER BY naam');
  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
