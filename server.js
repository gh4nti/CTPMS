const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const db = new sqlite3.Database("chinook.db");

app.get("/patients", (req, res) => {
	db.all(
		`SELECT
			p.PatientID as id,
			p.Name as full_name,
			p.DateOfBirth as dob,
			p.Gender as gender,
			CAST(p.Phone AS TEXT) as phone,
			COALESCE(p.Email, '') as email,
			p.Height as height,
			p.Weight as weight,
			COALESCE(p.BloodGroup, '') as blood_group,
			COALESCE(ptm.EligibilityStatus, 'screening') as enrollment_status,
			datetime('now') as created_at
		 FROM patients p
		 LEFT JOIN (
			SELECT m.PatientID, m.EligibilityStatus
			FROM Patient_Trial_Match m
			INNER JOIN (
				SELECT PatientID, MAX(MatchID) AS LatestMatchID
				FROM Patient_Trial_Match
				GROUP BY PatientID
			) latest ON latest.LatestMatchID = m.MatchID
		 ) ptm ON p.PatientID = ptm.PatientID
		 ORDER BY p.PatientID DESC`,
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
		phone,
		email,
		heightCm,
		weightKg,
		bloodGroup,
	} = req.body || {};

	if (
		!fullName ||
		!dob ||
		!gender ||
		!phone ||
		!email ||
		heightCm === undefined ||
		weightKg === undefined ||
		!bloodGroup
	) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	const parsedHeight = Number(heightCm);
	const parsedWeight = Number(weightKg);

	if (
		!Number.isFinite(parsedHeight) ||
		parsedHeight <= 0 ||
		!Number.isFinite(parsedWeight) ||
		parsedWeight <= 0
	) {
		res.status(400).json({
			error: "Height and weight must be positive numbers",
		});
		return;
	}

	db.get(
		`SELECT COALESCE(MAX(PatientID), 0) + 1 AS nextId FROM patients`,
		[],
		(nextIdError, nextIdRow) => {
			if (nextIdError) {
				res.status(500).json({
					error: "Could not determine next patient ID",
					details: nextIdError.message,
				});
				return;
			}

			const nextId = Number(nextIdRow && nextIdRow.nextId);
			const insertSql = `
				INSERT INTO patients (
					PatientID,
					Name,
					DateOfBirth,
					Gender,
					Phone,
					Email,
					Height,
					Weight,
					BloodGroup
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`;

			db.run(
				insertSql,
				[
					nextId,
					String(fullName).trim(),
					String(dob).trim(),
					String(gender).trim(),
					String(phone).trim(),
					String(email).trim(),
					parsedHeight,
					parsedWeight,
					String(bloodGroup).trim().toUpperCase(),
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
						id: nextId,
						message: "Patient added",
					});
				},
			);
		},
	);
});

const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
	app.use(express.static(distPath));

	app.use((req, res, next) => {
		if (req.path.startsWith("/patients")) {
			next();
			return;
		}

		res.sendFile(path.join(distPath, "index.html"));
	});
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
