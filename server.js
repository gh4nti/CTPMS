const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.json());

const db = new sqlite3.Database("chinook.db");

// Create table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
)`);

// API: Get users
app.get("/users", (req, res) => {
	db.all("SELECT * FROM users", [], (err, rows) => {
		res.json(rows);
	});
});

// API: Add user
app.post("/users", (req, res) => {
	const { name } = req.body;
	db.run("INSERT INTO users(name) VALUES(?)", [name]);
	res.send("User added");
});

app.listen(3000, () => console.log("Server running on port 3000"));
