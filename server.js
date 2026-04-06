const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
	if (req.url.startsWith("/api/")) {
		req.url = req.url.slice(4);
	}

	next();
});

const dbPath = path.join(__dirname, "clinical_trials.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
	db.run(`
		CREATE TABLE IF NOT EXISTS appointments (
			appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
			patient_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			start_time TEXT NOT NULL,
			end_time TEXT NOT NULL,
			location TEXT NOT NULL DEFAULT '',
			notes TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'scheduled',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time)`,
	);
	db.run(`
		CREATE TABLE IF NOT EXISTS invoices (
			invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
			patient_id INTEGER NOT NULL,
			invoice_number TEXT UNIQUE NOT NULL,
			invoice_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			due_date TEXT NOT NULL,
			amount REAL NOT NULL,
			description TEXT NOT NULL DEFAULT 'Clinical Treatment Services',
			status TEXT NOT NULL DEFAULT 'pending',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
		)
	`);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date)`,
	);
	db.run(`
		CREATE TABLE IF NOT EXISTS payments (
			payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
			invoice_id INTEGER NOT NULL,
			patient_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			payment_method TEXT NOT NULL DEFAULT 'credit_card',
			status TEXT NOT NULL DEFAULT 'pending',
			reference_number TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
			FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
		)
	`);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id)`,
	);
	db.run(
		`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
	);
});

function normalizeGender(inputGender) {
	const normalized = String(inputGender || "")
		.trim()
		.toLowerCase();

	switch (normalized) {
		case "male":
		case "m":
			return "Male";
		case "female":
		case "f":
			return "Female";
		case "other":
		case "non-binary":
		case "nonbinary":
		case "nb":
			return "Other";
		case "unknown":
		case "u":
		case "prefer not to say":
			return "Unknown";
		default:
			return "Unknown";
	}
}

function normalizePatientStatus(inputStatus) {
	const normalized = String(inputStatus || "")
		.trim()
		.toLowerCase()
		.replace(/[_\s]+/g, "-");

	if (
		normalized === "screening" ||
		normalized === "eligible" ||
		normalized === "enrolled" ||
		normalized === "not-eligible"
	) {
		return normalized;
	}

	return null;
}

function normalizeAppointmentStatus(inputStatus) {
	const normalized = String(inputStatus || "")
		.trim()
		.toLowerCase();

	if (normalized === "scheduled" || normalized === "cancelled") {
		return normalized;
	}

	return null;
}

function normalizeInvoiceStatus(inputStatus) {
	const normalized = String(inputStatus || "")
		.trim()
		.toLowerCase();

	if (
		normalized === "pending" ||
		normalized === "paid" ||
		normalized === "overdue" ||
		normalized === "cancelled"
	) {
		return normalized;
	}

	return null;
}

function normalizePaymentStatus(inputStatus) {
	const normalized = String(inputStatus || "")
		.trim()
		.toLowerCase();

	if (
		normalized === "pending" ||
		normalized === "completed" ||
		normalized === "failed"
	) {
		return normalized;
	}

	return null;
}

function generateInvoiceNumber() {
	const timestamp = Date.now().toString(36).toUpperCase();
	const randomNum = Math.floor(Math.random() * 10000)
		.toString(36)
		.toUpperCase();
	return `INV-${timestamp}-${randomNum}`;
}

function parseIsoDateTime(inputValue) {
	const parsedDate = new Date(String(inputValue || ""));

	if (Number.isNaN(parsedDate.getTime())) {
		return null;
	}

	return parsedDate;
}

function findAppointmentConflict(
	startTime,
	endTime,
	excludeAppointmentId,
	callback,
) {
	const params = [startTime, endTime];
	let conflictSql = `
		SELECT
			a.appointment_id,
			a.patient_id,
			a.title,
			a.start_time,
			a.end_time,
			p.name AS patient_name
		FROM appointments a
		INNER JOIN patients p ON p.patient_id = a.patient_id
		WHERE LOWER(COALESCE(a.status, '')) != 'cancelled'
			AND a.start_time < ?
			AND a.end_time > ?
	`;

	if (
		Number.isInteger(Number(excludeAppointmentId)) &&
		Number(excludeAppointmentId) > 0
	) {
		conflictSql += ` AND a.appointment_id != ?`;
		params.push(Number(excludeAppointmentId));
	}

	conflictSql += ` ORDER BY a.start_time ASC, a.appointment_id ASC LIMIT 1`;

	db.get(conflictSql, params, (err, row) => {
		if (err) {
			callback(err, null);
			return;
		}

		callback(null, row || null);
	});
}

function updatePatientStatus(patientId, inputStatus, callback) {
	const normalizedStatus = normalizePatientStatus(inputStatus);

	if (!normalizedStatus) {
		callback(new Error("Invalid enrollment status"));
		return;
	}

	db.get(
		`SELECT
			(SELECT enrollment_id FROM enrollment WHERE patient_id = ? ORDER BY enrollment_id DESC LIMIT 1) AS latest_enrollment_id,
			(SELECT match_id FROM patient_trial_matches WHERE patient_id = ? ORDER BY match_id DESC LIMIT 1) AS latest_match_id
		`,
		[patientId, patientId],
		(err, row) => {
			if (err) {
				callback(err);
				return;
			}

			const latestEnrollmentId = row && row.latest_enrollment_id;
			const latestMatchId = row && row.latest_match_id;

			let updateSql = "";
			let updateParams = [];

			if (
				normalizedStatus === "screening" ||
				normalizedStatus === "enrolled"
			) {
				if (latestEnrollmentId) {
					updateSql = `UPDATE enrollment SET enrollment_status = ? WHERE enrollment_id = ?`;
					updateParams = [
						normalizedStatus === "screening"
							? "Screening"
							: "Enrolled",
						latestEnrollmentId,
					];
				} else if (normalizedStatus === "screening" && latestMatchId) {
					updateSql = `UPDATE patient_trial_matches SET eligibility_status = ? WHERE match_id = ?`;
					updateParams = ["Pending", latestMatchId];
				} else {
					callback(
						new Error(
							"This patient has no status record to update.",
						),
					);
					return;
				}
			} else if (normalizedStatus === "eligible") {
				if (!latestMatchId) {
					callback(
						new Error(
							"This patient has no trial match record to update.",
						),
					);
					return;
				}

				updateSql = `UPDATE patient_trial_matches SET eligibility_status = ? WHERE match_id = ?`;
				updateParams = ["Eligible", latestMatchId];
			} else if (normalizedStatus === "not-eligible") {
				if (latestMatchId) {
					updateSql = `UPDATE patient_trial_matches SET eligibility_status = ? WHERE match_id = ?`;
					updateParams = ["Ineligible", latestMatchId];
				} else if (latestEnrollmentId) {
					updateSql = `UPDATE enrollment SET enrollment_status = ? WHERE enrollment_id = ?`;
					updateParams = ["Rejected", latestEnrollmentId];
				} else {
					callback(
						new Error(
							"This patient has no status record to update.",
						),
					);
					return;
				}
			}

			db.run(updateSql, updateParams, (updateErr) => {
				if (updateErr) {
					callback(updateErr);
					return;
				}

				callback(null);
			});
		},
	);
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

app.get("/patients/:id", (req, res) => {
	const patientId = Number(req.params.id);

	if (!Number.isInteger(patientId) || patientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	db.get(
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
		WHERE p.patient_id = ?`,
		[patientId],
		(err, row) => {
			if (err) {
				res.status(500).json({
					error: "Could not fetch patient",
					details: err.message,
				});
				return;
			}

			if (!row) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			res.json(row);
		},
	);
});

app.get("/patients/:id/records", (req, res) => {
	const patientId = Number(req.params.id);

	if (!Number.isInteger(patientId) || patientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	db.get(
		`SELECT patient_id FROM patients WHERE patient_id = ?`,
		[patientId],
		(checkErr, checkRow) => {
			if (checkErr) {
				res.status(500).json({
					error: "Could not verify patient exists",
					details: checkErr.message,
				});
				return;
			}

			if (!checkRow) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			const medicationsQuery = `
		SELECT
			pm.patient_med_id AS id,
			m.drug_name AS name,
			m.drug_class AS class,
			COALESCE(pm.dosage, '') AS dosage,
			pm.start_date AS start_date,
			pm.end_date AS end_date,
			pm.current_status AS current_status
		FROM patient_medications pm
		INNER JOIN medications m ON m.medication_id = pm.medication_id
		WHERE pm.patient_id = ?
		ORDER BY pm.start_date DESC, pm.patient_med_id DESC
	`;

			const visitsQuery = `
		SELECT
			lr.result_id AS id,
			lt.test_name AS title,
			lr.test_date AS date,
			lr.test_value AS value,
			lt.unit AS unit,
			lt.normal_range_lo AS normal_range_lo,
			lt.normal_range_hi AS normal_range_hi
		FROM lab_results lr
		INNER JOIN lab_tests lt ON lt.test_id = lr.test_id
		WHERE lr.patient_id = ?
		ORDER BY lr.test_date DESC, lr.result_id DESC
		LIMIT 8
	`;

			db.all(medicationsQuery, [patientId], (medErr, medications) => {
				if (medErr) {
					res.status(500).json({
						error: "Could not fetch patient medications",
						details: medErr.message,
					});
					return;
				}

				db.all(visitsQuery, [patientId], (visitErr, visits) => {
					if (visitErr) {
						res.status(500).json({
							error: "Could not fetch patient visit history",
							details: visitErr.message,
						});
						return;
					}

					res.json({
						medications: medications || [],
						visits:
							(visits || []).map((visit) => {
								let interpretation = "Within range";
								if (
									typeof visit.normal_range_lo === "number" &&
									visit.value < visit.normal_range_lo
								) {
									interpretation = "Below range";
								}
								if (
									typeof visit.normal_range_hi === "number" &&
									visit.value > visit.normal_range_hi
								) {
									interpretation = "Above range";
								}

								return {
									id: visit.id,
									title: visit.title,
									date: visit.date,
									value: visit.value,
									unit: visit.unit,
									interpretation,
								};
							}) || [],
						notes: [],
						allergies: [],
					});
				});
			});
		},
	);
});

app.get("/appointments", (req, res) => {
	const fromValue = parseIsoDateTime(req.query.from);
	const toValue = parseIsoDateTime(req.query.to);
	const patientId = req.query.patientId ? Number(req.query.patientId) : null;

	if (!fromValue || !toValue) {
		res.status(400).json({ error: "Invalid date range" });
		return;
	}

	if (fromValue.getTime() >= toValue.getTime()) {
		res.status(400).json({ error: "Invalid date range" });
		return;
	}

	const params = [toValue.toISOString(), fromValue.toISOString()];
	let appointmentsSql = `
		SELECT
			a.appointment_id AS id,
			a.patient_id,
			p.name AS patient_name,
			a.title,
			a.start_time,
			a.end_time,
			COALESCE(a.location, '') AS location,
			COALESCE(a.notes, '') AS notes,
			LOWER(COALESCE(a.status, 'scheduled')) AS status,
			a.created_at,
			a.updated_at
		FROM appointments a
		INNER JOIN patients p ON p.patient_id = a.patient_id
		WHERE LOWER(COALESCE(a.status, '')) != 'cancelled'
			AND a.start_time < ?
			AND a.end_time > ?
	`;

	if (Number.isInteger(patientId) && patientId > 0) {
		appointmentsSql += ` AND a.patient_id = ?`;
		params.push(patientId);
	}

	appointmentsSql += ` ORDER BY a.start_time ASC, a.appointment_id ASC`;

	db.all(appointmentsSql, params, (err, rows) => {
		if (err) {
			res.status(500).json({
				error: "Could not fetch appointments",
				details: err.message,
			});
			return;
		}

		res.json({ appointments: rows || [] });
	});
});

app.post("/appointments", (req, res) => {
	const { patientId, title, startTime, endTime, location, notes } =
		req.body || {};
	const parsedPatientId = Number(patientId);
	const normalizedTitle = String(title || "").trim();
	const normalizedLocation = String(location || "").trim();
	const normalizedNotes = String(notes || "").trim();
	const parsedStartTime = parseIsoDateTime(startTime);
	const parsedEndTime = parseIsoDateTime(endTime);

	if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	if (!normalizedTitle || !parsedStartTime || !parsedEndTime) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	if (parsedStartTime.getTime() >= parsedEndTime.getTime()) {
		res.status(400).json({
			error: "Appointment end time must be after start time",
		});
		return;
	}

	db.get(
		`SELECT patient_id, name FROM patients WHERE patient_id = ?`,
		[parsedPatientId],
		(patientErr, patientRow) => {
			if (patientErr) {
				res.status(500).json({
					error: "Could not verify patient exists",
					details: patientErr.message,
				});
				return;
			}

			if (!patientRow) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			findAppointmentConflict(
				parsedStartTime.toISOString(),
				parsedEndTime.toISOString(),
				null,
				(conflictErr, conflictRow) => {
					if (conflictErr) {
						res.status(500).json({
							error: "Could not check appointment conflicts",
							details: conflictErr.message,
						});
						return;
					}

					if (conflictRow) {
						res.status(409).json({
							error: "Appointment conflict detected",
							details: `Already booked for ${conflictRow.patient_name} from ${conflictRow.start_time} to ${conflictRow.end_time}`,
						});
						return;
					}

					db.run(
						`INSERT INTO appointments (
							patient_id,
							title,
							start_time,
							end_time,
							location,
							notes,
							status,
							created_at,
							updated_at
						) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
						[
							parsedPatientId,
							normalizedTitle,
							parsedStartTime.toISOString(),
							parsedEndTime.toISOString(),
							normalizedLocation,
							normalizedNotes,
						],
						function insertAppointment(insertErr) {
							if (insertErr) {
								res.status(500).json({
									error: "Could not save appointment",
									details: insertErr.message,
								});
								return;
							}

							res.status(201).json({
								id: this.lastID,
								message: "Appointment booked",
							});
						},
					);
				},
			);
		},
	);
});

app.put("/appointments/:id", (req, res) => {
	const appointmentId = Number(req.params.id);
	const { patientId, title, startTime, endTime, location, notes } =
		req.body || {};
	const parsedPatientId = Number(patientId);
	const normalizedTitle = String(title || "").trim();
	const normalizedLocation = String(location || "").trim();
	const normalizedNotes = String(notes || "").trim();
	const parsedStartTime = parseIsoDateTime(startTime);
	const parsedEndTime = parseIsoDateTime(endTime);

	if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
		res.status(400).json({ error: "Invalid appointment ID" });
		return;
	}

	if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	if (!normalizedTitle || !parsedStartTime || !parsedEndTime) {
		res.status(400).json({ error: "Missing required fields" });
		return;
	}

	if (parsedStartTime.getTime() >= parsedEndTime.getTime()) {
		res.status(400).json({
			error: "Appointment end time must be after start time",
		});
		return;
	}

	db.get(
		`SELECT appointment_id, status FROM appointments WHERE appointment_id = ?`,
		[appointmentId],
		(appointmentErr, appointmentRow) => {
			if (appointmentErr) {
				res.status(500).json({
					error: "Could not verify appointment exists",
					details: appointmentErr.message,
				});
				return;
			}

			if (!appointmentRow) {
				res.status(404).json({ error: "Appointment not found" });
				return;
			}

			if (
				normalizeAppointmentStatus(appointmentRow.status) ===
				"cancelled"
			) {
				res.status(400).json({
					error: "Cancelled appointments cannot be rescheduled",
				});
				return;
			}

			db.get(
				`SELECT patient_id, name FROM patients WHERE patient_id = ?`,
				[parsedPatientId],
				(patientErr, patientRow) => {
					if (patientErr) {
						res.status(500).json({
							error: "Could not verify patient exists",
							details: patientErr.message,
						});
						return;
					}

					if (!patientRow) {
						res.status(404).json({ error: "Patient not found" });
						return;
					}

					findAppointmentConflict(
						parsedStartTime.toISOString(),
						parsedEndTime.toISOString(),
						appointmentId,
						(conflictErr, conflictRow) => {
							if (conflictErr) {
								res.status(500).json({
									error: "Could not check appointment conflicts",
									details: conflictErr.message,
								});
								return;
							}

							if (conflictRow) {
								res.status(409).json({
									error: "Appointment conflict detected",
									details: `Already booked for ${conflictRow.patient_name} from ${conflictRow.start_time} to ${conflictRow.end_time}`,
								});
								return;
							}

							db.run(
								`UPDATE appointments
								SET patient_id = ?,
									title = ?,
									start_time = ?,
									end_time = ?,
									location = ?,
									notes = ?,
									status = 'scheduled',
									updated_at = CURRENT_TIMESTAMP
								WHERE appointment_id = ?`,
								[
									parsedPatientId,
									normalizedTitle,
									parsedStartTime.toISOString(),
									parsedEndTime.toISOString(),
									normalizedLocation,
									normalizedNotes,
									appointmentId,
								],
								function updateAppointment(updateErr) {
									if (updateErr) {
										res.status(500).json({
											error: "Could not update appointment",
											details: updateErr.message,
										});
										return;
									}

									res.json({
										id: appointmentId,
										message: "Appointment rescheduled",
									});
								},
							);
						},
					);
				},
			);
		},
	);
});

app.patch("/appointments/:id/cancel", (req, res) => {
	const appointmentId = Number(req.params.id);

	if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
		res.status(400).json({ error: "Invalid appointment ID" });
		return;
	}

	db.get(
		`SELECT appointment_id, status FROM appointments WHERE appointment_id = ?`,
		[appointmentId],
		(appointmentErr, appointmentRow) => {
			if (appointmentErr) {
				res.status(500).json({
					error: "Could not verify appointment exists",
					details: appointmentErr.message,
				});
				return;
			}

			if (!appointmentRow) {
				res.status(404).json({ error: "Appointment not found" });
				return;
			}

			if (
				normalizeAppointmentStatus(appointmentRow.status) ===
				"cancelled"
			) {
				res.json({
					id: appointmentId,
					message: "Appointment already cancelled",
				});
				return;
			}

			db.run(
				`UPDATE appointments
				SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
				WHERE appointment_id = ?`,
				[appointmentId],
				function cancelAppointment(cancelErr) {
					if (cancelErr) {
						res.status(500).json({
							error: "Could not cancel appointment",
							details: cancelErr.message,
						});
						return;
					}

					res.json({
						id: appointmentId,
						message: "Appointment cancelled",
					});
				},
			);
		},
	);
});

// Billing and Payments Routes

app.get("/invoices", (req, res) => {
	const patientId = req.query.patientId ? Number(req.query.patientId) : null;
	const status = req.query.status
		? String(req.query.status).toLowerCase()
		: null;

	let sql = `
		SELECT
			i.invoice_id AS id,
			i.patient_id,
			p.name AS patient_name,
			i.invoice_number,
			i.invoice_date,
			i.due_date,
			i.amount,
			i.description,
			i.status,
			COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'completed'), 0) AS paid_amount,
			i.created_at,
			i.updated_at
		FROM invoices i
		INNER JOIN patients p ON p.patient_id = i.patient_id
		WHERE 1=1
	`;

	const params = [];

	if (Number.isInteger(patientId) && patientId > 0) {
		sql += ` AND i.patient_id = ?`;
		params.push(patientId);
	}

	if (status && normalizeInvoiceStatus(status)) {
		sql += ` AND LOWER(i.status) = ?`;
		params.push(status);
	}

	sql += ` ORDER BY i.invoice_date DESC, i.invoice_id DESC`;

	db.all(sql, params, (err, rows) => {
		if (err) {
			res.status(500).json({
				error: "Could not fetch invoices",
				details: err.message,
			});
			return;
		}

		res.json({ invoices: rows || [] });
	});
});

app.get("/invoices/:id", (req, res) => {
	const invoiceId = Number(req.params.id);

	if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
		res.status(400).json({ error: "Invalid invoice ID" });
		return;
	}

	db.get(
		`SELECT
			i.invoice_id AS id,
			i.patient_id,
			p.name AS patient_name,
			p.email AS patient_email,
			p.phone AS patient_phone,
			i.invoice_number,
			i.invoice_date,
			i.due_date,
			i.amount,
			i.description,
			i.status,
			COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'completed'), 0) AS paid_amount,
			i.created_at,
			i.updated_at
		FROM invoices i
		INNER JOIN patients p ON p.patient_id = i.patient_id
		WHERE i.invoice_id = ?`,
		[invoiceId],
		(err, row) => {
			if (err) {
				res.status(500).json({
					error: "Could not fetch invoice",
					details: err.message,
				});
				return;
			}

			if (!row) {
				res.status(404).json({ error: "Invoice not found" });
				return;
			}

			db.all(
				`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC`,
				[invoiceId],
				(paymentErr, payments) => {
					if (paymentErr) {
						res.status(500).json({
							error: "Could not fetch payments",
							details: paymentErr.message,
						});
						return;
					}

					res.json({
						...row,
						payments: payments || [],
					});
				},
			);
		},
	);
});

app.post("/invoices", (req, res) => {
	const { patientId, amount, description, dueDate } = req.body || {};
	const parsedPatientId = Number(patientId);
	const parsedAmount = Number(amount);
	const normalizedDescription = String(description || "")
		.trim()
		.substring(0, 500);
	const parsedDueDate = parseIsoDateTime(dueDate);

	if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
		res.status(400).json({ error: "Amount must be a positive number" });
		return;
	}

	if (!parsedDueDate) {
		res.status(400).json({ error: "Invalid due date" });
		return;
	}

	db.get(
		`SELECT patient_id FROM patients WHERE patient_id = ?`,
		[parsedPatientId],
		(patientErr, patientRow) => {
			if (patientErr) {
				res.status(500).json({
					error: "Could not verify patient exists",
					details: patientErr.message,
				});
				return;
			}

			if (!patientRow) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			const invoiceNumber = generateInvoiceNumber();

			db.run(
				`INSERT INTO invoices (
					patient_id,
					invoice_number,
					amount,
					description,
					due_date,
					status,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				[
					parsedPatientId,
					invoiceNumber,
					parsedAmount,
					normalizedDescription || "Clinical Treatment Services",
					parsedDueDate.toISOString(),
				],
				function insertInvoice(insertErr) {
					if (insertErr) {
						res.status(500).json({
							error: "Could not create invoice",
							details: insertErr.message,
						});
						return;
					}

					res.status(201).json({
						id: this.lastID,
						invoice_number: invoiceNumber,
						message: "Invoice created",
					});
				},
			);
		},
	);
});

app.patch("/invoices/:id/status", (req, res) => {
	const invoiceId = Number(req.params.id);
	const { status } = req.body || {};
	const normalizedStatus = normalizeInvoiceStatus(status);

	if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
		res.status(400).json({ error: "Invalid invoice ID" });
		return;
	}

	if (!normalizedStatus) {
		res.status(400).json({
			error: "Invalid status. Must be: pending, paid, overdue, or cancelled",
		});
		return;
	}

	db.get(
		`SELECT invoice_id, status FROM invoices WHERE invoice_id = ?`,
		[invoiceId],
		(invoiceErr, invoiceRow) => {
			if (invoiceErr) {
				res.status(500).json({
					error: "Could not verify invoice exists",
					details: invoiceErr.message,
				});
				return;
			}

			if (!invoiceRow) {
				res.status(404).json({ error: "Invoice not found" });
				return;
			}

			db.run(
				`UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?`,
				[normalizedStatus, invoiceId],
				function updateInvoice(updateErr) {
					if (updateErr) {
						res.status(500).json({
							error: "Could not update invoice status",
							details: updateErr.message,
						});
						return;
					}

					res.json({
						id: invoiceId,
						status: normalizedStatus,
						message: "Invoice status updated",
					});
				},
			);
		},
	);
});

app.get("/payments", (req, res) => {
	const invoiceId = req.query.invoiceId ? Number(req.query.invoiceId) : null;
	const patientId = req.query.patientId ? Number(req.query.patientId) : null;
	const status = req.query.status
		? String(req.query.status).toLowerCase()
		: null;

	let sql = `
		SELECT
			p.payment_id AS id,
			p.invoice_id,
			i.invoice_number,
			p.patient_id,
			pt.name AS patient_name,
			p.amount,
			p.payment_date,
			p.payment_method,
			p.status,
			p.reference_number,
			p.notes,
			p.created_at
		FROM payments p
		INNER JOIN invoices i ON i.invoice_id = p.invoice_id
		INNER JOIN patients pt ON pt.patient_id = p.patient_id
		WHERE 1=1
	`;

	const params = [];

	if (Number.isInteger(invoiceId) && invoiceId > 0) {
		sql += ` AND p.invoice_id = ?`;
		params.push(invoiceId);
	}

	if (Number.isInteger(patientId) && patientId > 0) {
		sql += ` AND p.patient_id = ?`;
		params.push(patientId);
	}

	if (status && normalizePaymentStatus(status)) {
		sql += ` AND LOWER(p.status) = ?`;
		params.push(status);
	}

	sql += ` ORDER BY p.payment_date DESC, p.payment_id DESC`;

	db.all(sql, params, (err, rows) => {
		if (err) {
			res.status(500).json({
				error: "Could not fetch payments",
				details: err.message,
			});
			return;
		}

		res.json({ payments: rows || [] });
	});
});

app.post("/payments", (req, res) => {
	const { invoiceId, amount, paymentMethod, referenceNumber, notes } =
		req.body || {};
	const parsedInvoiceId = Number(invoiceId);
	const parsedAmount = Number(amount);
	const normalizedPaymentMethod = String(
		paymentMethod || "credit_card",
	).trim();
	const normalizedReference = String(referenceNumber || "").trim();
	const normalizedNotes = String(notes || "").trim();

	if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
		res.status(400).json({ error: "Invalid invoice ID" });
		return;
	}

	if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
		res.status(400).json({ error: "Amount must be a positive number" });
		return;
	}

	db.get(
		`SELECT i.invoice_id, i.patient_id, i.amount, i.status, COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id AND status = 'completed'), 0) AS paid_amount
		FROM invoices i WHERE i.invoice_id = ?`,
		[parsedInvoiceId],
		(invoiceErr, invoiceRow) => {
			if (invoiceErr) {
				res.status(500).json({
					error: "Could not verify invoice exists",
					details: invoiceErr.message,
				});
				return;
			}

			if (!invoiceRow) {
				res.status(404).json({ error: "Invoice not found" });
				return;
			}

			const totalPaid = invoiceRow.paid_amount + parsedAmount;
			if (totalPaid > invoiceRow.amount) {
				res.status(400).json({
					error: "Payment amount exceeds invoice total",
					details: `Invoice total: $${invoiceRow.amount}, already paid: $${invoiceRow.paid_amount}, payment: $${parsedAmount}`,
				});
				return;
			}

			db.run(
				`INSERT INTO payments (
					invoice_id,
					patient_id,
					amount,
					payment_method,
					reference_number,
					notes,
					status,
					payment_date,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				[
					parsedInvoiceId,
					invoiceRow.patient_id,
					parsedAmount,
					normalizedPaymentMethod,
					normalizedReference,
					normalizedNotes,
				],
				function insertPayment(insertErr) {
					if (insertErr) {
						res.status(500).json({
							error: "Could not record payment",
							details: insertErr.message,
						});
						return;
					}

					const newTotalPaid = invoiceRow.paid_amount + parsedAmount;
					const isFullyPaid =
						Math.abs(newTotalPaid - invoiceRow.amount) < 0.01;

					if (isFullyPaid) {
						db.run(
							`UPDATE invoices SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?`,
							[parsedInvoiceId],
							(updateErr) => {
								if (updateErr) {
									console.error(
										"Warning: Could not update invoice status to paid:",
										updateErr.message,
									);
								}
							},
						);
					}

					res.status(201).json({
						id: this.lastID,
						message: "Payment recorded",
						fully_paid: isFullyPaid,
					});
				},
			);
		},
	);
});

app.get("/payments/:id", (req, res) => {
	const paymentId = Number(req.params.id);

	if (!Number.isInteger(paymentId) || paymentId <= 0) {
		res.status(400).json({ error: "Invalid payment ID" });
		return;
	}

	db.get(
		`SELECT
			p.payment_id AS id,
			p.invoice_id,
			i.invoice_number,
			i.invoice_date,
			i.due_date,
			i.amount AS invoice_amount,
			p.patient_id,
			pt.name AS patient_name,
			pt.email AS patient_email,
			pt.phone AS patient_phone,
			p.amount,
			p.payment_date,
			p.payment_method,
			p.status,
			p.reference_number,
			p.notes,
			p.created_at
		FROM payments p
		INNER JOIN invoices i ON i.invoice_id = p.invoice_id
		INNER JOIN patients pt ON pt.patient_id = p.patient_id
		WHERE p.payment_id = ?`,
		[paymentId],
		(err, row) => {
			if (err) {
				res.status(500).json({
					error: "Could not fetch payment",
					details: err.message,
				});
				return;
			}

			if (!row) {
				res.status(404).json({ error: "Payment not found" });
				return;
			}

			res.json(row);
		},
	);
});

app.delete("/patients/:id", (req, res) => {
	const patientId = Number(req.params.id);

	if (!Number.isInteger(patientId) || patientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

	db.get(
		`SELECT patient_id FROM patients WHERE patient_id = ?`,
		[patientId],
		(checkErr, checkRow) => {
			if (checkErr) {
				res.status(500).json({
					error: "Could not verify patient exists",
					details: checkErr.message,
				});
				return;
			}

			if (!checkRow) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			const dependentTables = [
				"patient_trial_matches",
				"enrollment",
				"diagnoses",
				"patient_medications",
				"lab_results",
				"appointments",
				"payments",
				"invoices",
			];

			const deleteRows = dependentTables.map(
				(table) =>
					new Promise((resolve, reject) => {
						db.run(
							`DELETE FROM ${table} WHERE patient_id = ?`,
							[patientId],
							(err) => {
								if (err) {
									reject(err);
									return;
								}

								resolve(null);
							},
						);
					}),
			);

			Promise.all(deleteRows)
				.then(
					() =>
						new Promise((resolve, reject) => {
							db.run(
								`DELETE FROM patients WHERE patient_id = ?`,
								[patientId],
								(err) => {
									if (err) {
										reject(err);
										return;
									}

									resolve(null);
								},
							);
						}),
				)
				.then(() => {
					res.json({
						id: patientId,
						message: "Patient deleted",
					});
				})
				.catch((err) => {
					res.status(500).json({
						error: "Could not delete patient",
						details: err.message,
					});
				});
		},
	);
});

function checkDuplicatePatient(name, email, excludeId = null, callback) {
	const query = `
		SELECT patient_id FROM patients 
		WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) 
		OR LOWER(TRIM(email)) = LOWER(TRIM(?))
	`;

	db.all(query, [name, email], (err, rows) => {
		if (err) {
			callback(null, err);
			return;
		}

		let duplicateFields = [];

		if (rows && rows.length > 0) {
			const duplicateIds = rows.map((r) => r.patient_id);
			const isDuplicate =
				excludeId == null || !duplicateIds.includes(excludeId);

			if (isDuplicate) {
				if (rows.some((r) => r.patient_id !== excludeId)) {
					const sameNameQuery = `SELECT COUNT(*) as count FROM patients 
						WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`;
					db.get(sameNameQuery, [name], (nameErr, nameRow) => {
						if (!nameErr && nameRow && nameRow.count > 0) {
							duplicateFields.push("name");
						}

						const sameEmailQuery = `SELECT COUNT(*) as count FROM patients 
							WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`;
						db.get(
							sameEmailQuery,
							[email],
							(emailErr, emailRow) => {
								if (
									!emailErr &&
									emailRow &&
									emailRow.count > 0
								) {
									duplicateFields.push("email");
								}
								callback({ duplicateFields }, null);
							},
						);
					});
					return;
				}
			}
		}

		callback(null, null);
	});
}

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
		enrollmentStatus,
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

	const normalizedStatus = normalizePatientStatus(enrollmentStatus);
	if (enrollmentStatus && !normalizedStatus) {
		res.status(400).json({ error: "Invalid enrollment status" });
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

	checkDuplicatePatient(
		fullName,
		String(email).trim(),
		null,
		(duplicate, err) => {
			if (err) {
				res.status(500).json({
					error: "Could not check for duplicate patients",
					details: err.message,
				});
				return;
			}

			if (duplicate && duplicate.duplicateFields.length > 0) {
				const fields = duplicate.duplicateFields.join(" and ");
				res.status(409).json({
					error: "Duplicate patient detected",
					details: `A patient with the same ${fields} already exists`,
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
		},
	);
});

app.put("/patients/:id", (req, res) => {
	const patientId = Number(req.params.id);

	if (!Number.isInteger(patientId) || patientId <= 0) {
		res.status(400).json({ error: "Invalid patient ID" });
		return;
	}

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
		`SELECT patient_id FROM patients WHERE patient_id = ?`,
		[patientId],
		(checkErr, checkRow) => {
			if (checkErr) {
				res.status(500).json({
					error: "Could not verify patient exists",
					details: checkErr.message,
				});
				return;
			}

			if (!checkRow) {
				res.status(404).json({ error: "Patient not found" });
				return;
			}

			checkDuplicatePatient(
				fullName,
				String(email).trim(),
				patientId,
				(duplicate, err) => {
					if (err) {
						res.status(500).json({
							error: "Could not check for duplicate patients",
							details: err.message,
						});
						return;
					}

					if (duplicate && duplicate.duplicateFields.length > 0) {
						const fields = duplicate.duplicateFields.join(" and ");
						res.status(409).json({
							error: "Duplicate patient detected",
							details: `Another patient with the same ${fields} already exists`,
						});
						return;
					}

					const updateSql = `
				UPDATE patients 
				SET 
					name = ?,
					date_of_birth = ?,
					gender = ?,
					phone = ?,
					email = ?,
					height_cm = ?,
					weight_kg = ?,
					blood_group = ?
				WHERE patient_id = ?
			`;

					db.run("BEGIN TRANSACTION");

					db.run(
						updateSql,
						[
							String(fullName).trim(),
							String(dob).trim(),
							normalizeGender(gender),
							String(phone).trim(),
							String(email).trim(),
							parsedHeight,
							parsedWeight,
							String(bloodGroup).trim().toUpperCase(),
							patientId,
						],
						function updatePatient(err) {
							if (err) {
								db.run("ROLLBACK");
								res.status(500).json({
									error: "Could not update patient",
									details: err.message,
								});
								return;
							}

							if (normalizedStatus) {
								updatePatientStatus(
									patientId,
									normalizedStatus,
									(statusErr) => {
										if (statusErr) {
											db.run("ROLLBACK");
											res.status(400).json({
												error: "Could not update status",
												details: statusErr.message,
											});
											return;
										}

										db.run("COMMIT", (commitErr) => {
											if (commitErr) {
												db.run("ROLLBACK");
												res.status(500).json({
													error: "Could not save patient updates",
													details: commitErr.message,
												});
												return;
											}

											res.json({
												id: patientId,
												message: "Patient updated",
											});
										});
									},
								);
								return;
							}

							db.run("COMMIT", (commitErr) => {
								if (commitErr) {
									db.run("ROLLBACK");
									res.status(500).json({
										error: "Could not save patient updates",
										details: commitErr.message,
									});
									return;
								}

								res.json({
									id: patientId,
									message: "Patient updated",
								});
							});
						},
					);
				},
			);
		},
	);
});

const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
	app.use(express.static(distPath));

	app.use((req, res, next) => {
		if (req.path.startsWith("/patients") || req.path.startsWith("/api/")) {
			next();
			return;
		}

		res.sendFile(path.join(distPath, "index.html"));
	});
}

if (require.main === module) {
	const PORT = Number(process.env.PORT) || 3000;
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
