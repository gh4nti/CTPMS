const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.json());

const db = new sqlite3.Database("chinook.db");
const TABLE_NAME = "trial_patients";

db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		full_name TEXT NOT NULL,
		dob TEXT NOT NULL,
		gender TEXT NOT NULL,
		trial_code TEXT NOT NULL,
		primary_condition TEXT NOT NULL,
		enrollment_status TEXT NOT NULL,
		phone TEXT,
		notes TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`);
});

app.get("/patients", (req, res) => {
	db.all(
		`SELECT
			id,
			full_name,
			dob,
			gender,
			trial_code,
			primary_condition AS patient_condition,
			enrollment_status,
			phone,
			notes,
			created_at
		 FROM ${TABLE_NAME}
		 ORDER BY datetime(created_at) DESC, id DESC`,
		[],
		(err, rows) => {
			if (err) {
				res.status(500).json({
					error: "Could not fetch patients",
					details: err.message,
				});
				return;
			}

			res.json(rows);
		},
	);
});

app.post("/patients", (req, res) => {
	const {
		fullName,
		dob,
		gender,
		trialCode,
		condition,
		status,
		phone = "",
		notes = "",
	} = req.body || {};

	if (!fullName || !dob || !gender || !trialCode || !condition || !status) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	const sql = `
		INSERT INTO ${TABLE_NAME} (
			full_name,
			dob,
			gender,
			trial_code,
			primary_condition,
			enrollment_status,
			phone,
			notes
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`;

	db.run(
		sql,
		[
			String(fullName).trim(),
			String(dob).trim(),
			String(gender).trim(),
			String(trialCode).trim(),
			String(condition).trim(),
			String(status).trim(),
			String(phone).trim(),
			String(notes).trim(),
		],
		function insertPatient(err) {
			if (err) {
				res.status(500).json({
					error: "Could not save patient",
					details: err.message,
				});
				return;
			}

			res.status(201).json({ id: this.lastID, message: "Patient added" });
		},
	);
});

app.listen(3000, () => console.log("Server running on port 3000"));
