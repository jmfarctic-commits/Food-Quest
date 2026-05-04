// server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the in-memory SQlite database.');
});

// Create food table
db.serialize(() => {
    db.run(`CREATE TABLE foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        rating INTEGER
    )`);
});

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});

const upload = multer({ storage });

// CRUD Operations

// Create food item
app.post('/api/foods', upload.single('image'), (req, res) => {
    const { name, description, rating } = req.body;
    const image = req.file ? req.file.filename : null;

    db.run(`INSERT INTO foods (name, description, image, rating) VALUES (?, ?, ?, ?)`, 
           [name, description, image, rating], 
           function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, name, description, image, rating });
    });
});

// Read all food items
app.get('/api/foods', (req, res) => {
    db.all(`SELECT * FROM foods`, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get food item by ID
app.get('/api/foods/:id', (req, res) => {
    db.get(`SELECT * FROM foods WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(row);
    });
});

// Update food item
app.put('/api/foods/:id', upload.single('image'), (req, res) => {
    const { name, description, rating } = req.body;
    const image = req.file ? req.file.filename : null;

    const sql = `UPDATE foods SET name = ?, description = ?, image = ?, rating = ? WHERE id = ?`;
    db.run(sql, [name, description, image, rating, req.params.id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Food item updated successfully' });
    });
});

// Delete food item
app.delete('/api/foods/:id', (req, res) => {
    db.run(`DELETE FROM foods WHERE id = ?`, req.params.id, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Food item deleted successfully' });
    });
});

// Server listening
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Close the database connection upon exit
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
    process.exit(0);
});
