const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const dbPath = path.join(__dirname, "clinical_trials.db");
const db = new sqlite3.Database(dbPath);

function normalizeGender(inputGender) {
	const normalized = String(inputGender || "")
		.trim()
		.toLowerCase();

	switch (normalized) {
		case "male":
			return "Male";
		case "female":
			return "Female";
		case "other":
		case "non-binary":
		case "nonbinary":
			return "Other";
		default:
			return "Unknown";
	}
}

app.get("/patients", (req, res) => {
	db.all(
		`WITH latest_match AS (
			SELECT m.patient_id, m.trial_id, m.eligibility_status
			FROM patient_trial_matches m
			INNER JOIN (
				SELECT patient_id, MAX(match_id) AS latest_match_id
				FROM patient_trial_matches
				GROUP BY patient_id
			) lm ON lm.latest_match_id = m.match_id
		),
		latest_enrollment AS (
			SELECT e.patient_id, e.trial_id, e.enrollment_status
			FROM enrollment e
			INNER JOIN (
				SELECT patient_id, MAX(enrollment_id) AS latest_enrollment_id
				FROM enrollment
				GROUP BY patient_id
			) le ON le.latest_enrollment_id = e.enrollment_id
		),
		latest_diagnosis AS (
			SELECT d.patient_id, d.disease_id
			FROM diagnoses d
			INNER JOIN (
				SELECT patient_id, MAX(diagnosis_id) AS latest_diagnosis_id
				FROM diagnoses
				GROUP BY patient_id
			) ld ON ld.latest_diagnosis_id = d.diagnosis_id
		)
		SELECT
			p.patient_id AS id,
			p.name AS full_name,
			p.date_of_birth AS dob,
			CAST((julianday('now') - julianday(p.date_of_birth)) / 365.2425 AS INTEGER) AS age,
			p.gender AS gender,
			COALESCE(CAST(p.phone AS TEXT), '') AS phone,
			COALESCE(p.email, '') AS email,
			p.height_cm AS height,
			p.weight_kg AS weight,
			COALESCE(p.blood_group, '') AS blood_group,
			COALESCE(dis.disease_name, trial_dis.disease_name, 'Not recorded') AS disease,
			COALESCE(ct.trial_title, '') AS trial,
			CASE
				WHEN LOWER(COALESCE(en.enrollment_status, '')) IN ('enrolled', 'completed') THEN 'enrolled'
				WHEN LOWER(COALESCE(en.enrollment_status, '')) = 'screening' THEN 'screening'
				WHEN LOWER(COALESCE(en.enrollment_status, '')) IN ('withdrawn', 'rejected') THEN 'not-eligible'
				WHEN LOWER(COALESCE(lm.eligibility_status, '')) = 'eligible' THEN 'eligible'
				WHEN LOWER(COALESCE(lm.eligibility_status, '')) = 'ineligible' THEN 'not-eligible'
				WHEN LOWER(COALESCE(lm.eligibility_status, '')) = 'pending' THEN 'screening'
				ELSE 'screening'
			END AS enrollment_status,
			p.created_at AS created_at
		FROM patients p
		LEFT JOIN latest_match lm ON p.patient_id = lm.patient_id
		LEFT JOIN latest_enrollment en ON p.patient_id = en.patient_id
		LEFT JOIN clinical_trials ct ON ct.trial_id = COALESCE(en.trial_id, lm.trial_id)
		LEFT JOIN latest_diagnosis dx ON p.patient_id = dx.patient_id
		LEFT JOIN diseases dis ON dx.disease_id = dis.disease_id
		LEFT JOIN diseases trial_dis ON ct.target_disease_id = trial_dis.disease_id
		ORDER BY p.patient_id DESC`,
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
		`SELECT COALESCE(MAX(patient_id), 0) + 1 AS nextId FROM patients`,
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
					patient_id,
					name,
					date_of_birth,
					gender,
					phone,
					email,
					height_cm,
					weight_kg,
					blood_group
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`;

			db.run(
				insertSql,
				[
					nextId,
					String(fullName).trim(),
					String(dob).trim(),
					normalizeGender(gender),
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
