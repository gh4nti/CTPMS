const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const db = new sqlite3.Database("chinook.db");
const TABLE_NAME = "trial_patients";

function normalizeText(value) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function hasAnyKeyword(text, keywords) {
	return keywords.some((keyword) => text.includes(keyword));
}

function assignEnrollmentStatus({
	fullName,
	dob,
	gender,
	trialCode,
	condition,
	notes,
	phone,
}) {
	const noteText = normalizeText(notes);
	const hasCoreFields = [fullName, dob, gender, trialCode, condition].every(
		(field) => normalizeText(field).length > 0,
	);

	if (!hasCoreFields) {
		return "screening";
	}

	if (
		hasAnyKeyword(noteText, [
			"on hold",
			"hold",
			"pending",
			"missing",
			"incomplete",
			"defer",
		])
	) {
		return "hold";
	}

	if (
		hasAnyKeyword(noteText, [
			"enrolled",
			"consented",
			"randomized",
			"active treatment",
		])
	) {
		return "enrolled";
	}

	if (
		hasAnyKeyword(noteText, [
			"eligible",
			"meets criteria",
			"qualified",
			"screen pass",
		]) ||
		normalizeText(phone).length > 0
	) {
		return "eligible";
	}

	return "screening";
}

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
		phone = "",
		notes = "",
	} = req.body || {};

	if (!fullName || !dob || !gender || !trialCode || !condition) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	const computedStatus = assignEnrollmentStatus({
		fullName,
		dob,
		gender,
		trialCode,
		condition,
		phone,
		notes,
	});

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
			computedStatus,
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

			res.status(201).json({
				id: this.lastID,
				message: "Patient added",
				enrollmentStatus: computedStatus,
			});
		},
	);
});

const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
	app.use(express.static(distPath));

	app.get("*", (req, res, next) => {
		if (req.path.startsWith("/patients")) {
			next();
			return;
		}

		res.sendFile(path.join(distPath, "index.html"));
	});
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
