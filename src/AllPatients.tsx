import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthUser, fetchWithAuth, hasPermission } from "./auth";

type EnrollmentStatus =
	| "screening"
	| "eligible"
	| "enrolled"
	| "hold"
	| "not-eligible";

interface Patient {
	id: number;
	full_name: string;
	dob: string;
	age: number | null;
	gender: string;
	phone: string;
	email: string;
	height: number | null;
	weight: number | null;
	blood_group: string;
	disease: string;
	trial: string;
	enrollment_status: EnrollmentStatus;
	created_at: string;
}

interface ImportRecord {
	fullName: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	heightCm: string;
	weightKg: string;
	bloodGroup: string;
	enrollmentStatus?: string;
}

interface ImportPreviewRow {
	index: number;
	record: ImportRecord;
	valid: boolean;
	errors: string[];
}

interface ImportPreviewResponse {
	summary: {
		total: number;
		valid: number;
		invalid: number;
	};
	rows: ImportPreviewRow[];
}

interface ImportCommitResponse {
	message: string;
	summary?: {
		total: number;
		inserted: number;
		rejected: number;
	};
}

interface ApiErrorBody {
	error?: string;
	details?: string;
}

const IMPORT_REQUIRED_HEADERS = [
	"fullName",
	"dob",
	"gender",
	"phone",
	"email",
	"heightCm",
	"weightKg",
	"bloodGroup",
];

function csvEscape(value: string | number | null | undefined): string {
	const text = String(value ?? "");
	if (/[",\n]/.test(text)) {
		return `"${text.replace(/"/g, '""')}"`;
	}

	return text;
}

function parseCsvLine(line: string): string[] {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"' && inQuotes && nextChar === '"') {
			current += '"';
			i += 1;
			continue;
		}

		if (char === '"') {
			inQuotes = !inQuotes;
			continue;
		}

		if (char === "," && !inQuotes) {
			values.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	values.push(current.trim());
	return values;
}

function parseImportCsv(text: string): ImportRecord[] {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (!lines.length) {
		throw new Error("The selected CSV file is empty.");
	}

	const headerValues = parseCsvLine(lines[0]);
	const headerMap = new Map(
		headerValues.map((header, index) => [header.trim(), index]),
	);

	for (const requiredHeader of IMPORT_REQUIRED_HEADERS) {
		if (!headerMap.has(requiredHeader)) {
			throw new Error(
				`Missing required column: ${requiredHeader}. Expected columns: ${IMPORT_REQUIRED_HEADERS.join(", ")}`,
			);
		}
	}

	const records: ImportRecord[] = [];

	for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
		const rowValues = parseCsvLine(lines[lineIndex]);
		const record: ImportRecord = {
			fullName: rowValues[headerMap.get("fullName") ?? -1] || "",
			dob: rowValues[headerMap.get("dob") ?? -1] || "",
			gender: rowValues[headerMap.get("gender") ?? -1] || "",
			phone: rowValues[headerMap.get("phone") ?? -1] || "",
			email: rowValues[headerMap.get("email") ?? -1] || "",
			heightCm: rowValues[headerMap.get("heightCm") ?? -1] || "",
			weightKg: rowValues[headerMap.get("weightKg") ?? -1] || "",
			bloodGroup: rowValues[headerMap.get("bloodGroup") ?? -1] || "",
			enrollmentStatus:
				rowValues[headerMap.get("enrollmentStatus") ?? -1] || "",
		};

		if (Object.values(record).some((value) => String(value).trim())) {
			records.push(record);
		}
	}

	if (!records.length) {
		throw new Error("No import rows were found in the CSV file.");
	}

	return records;
}

function prettyStatus(rawStatus: string): string {
	if (!rawStatus) {
		return "Unknown";
	}

	return rawStatus
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function statusPillClasses(status: string): string {
	const normalizedStatus = status
		.trim()
		.toLowerCase()
		.replace(/[_\s]+/g, "-");

	switch (normalizedStatus) {
		case "enrolled":
			return "bg-emerald-100 text-emerald-800";
		case "eligible":
			return "bg-cyan-100 text-cyan-800";
		case "screening":
			return "bg-yellow-100 text-yellow-800";
		case "hold":
			return "bg-amber-100 text-amber-800";
		case "not-eligible":
			return "bg-rose-100 text-rose-800";
		default:
			return "bg-slate-200 text-slate-700";
	}
}

function prettyGender(rawGender: string): string {
	const normalized = String(rawGender || "")
		.trim()
		.toLowerCase();

	if (!normalized || normalized === "unknown") {
		return "Unknown";
	}

	if (normalized === "m" || normalized === "male") {
		return "Male";
	}

	if (normalized === "f" || normalized === "female") {
		return "Female";
	}

	if (
		normalized === "other" ||
		normalized === "non-binary" ||
		normalized === "nonbinary" ||
		normalized === "nb"
	) {
		return "Other";
	}

	return rawGender.trim();
}

function normalizeText(value: string | number): string {
	return String(value).trim().toLowerCase();
}

type FieldSearchKey =
	| "id"
	| "name"
	| "phone"
	| "email"
	| "status"
	| "gender"
	| "age"
	| "dob"
	| "disease"
	| "trial";

interface ParsedSearchQuery {
	freeTerms: string[];
	fieldTerms: Array<{ key: FieldSearchKey; value: string }>;
}

function tokenizeQuery(query: string): string[] {
	const tokens = query.match(/"([^"]+)"|(\S+)/g) || [];
	return tokens
		.map((token) => token.replace(/^"|"$/g, "").trim())
		.filter(Boolean);
}

function normalizeStatusValue(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[_\s]+/g, "-");
}

function normalizeGenderValue(value: string): string {
	const normalized = value.trim().toLowerCase();

	if (normalized === "f") {
		return "female";
	}

	if (normalized === "m") {
		return "male";
	}

	if (normalized === "nb") {
		return "other";
	}

	return normalized;
}

function parseSearchQuery(query: string): ParsedSearchQuery {
	const validKeys = new Set<FieldSearchKey>([
		"id",
		"name",
		"phone",
		"email",
		"status",
		"gender",
		"age",
		"dob",
		"disease",
		"trial",
	]);

	const freeTerms: string[] = [];
	const fieldTerms: Array<{ key: FieldSearchKey; value: string }> = [];

	for (const token of tokenizeQuery(query)) {
		const separatorIndex = token.indexOf(":");

		if (separatorIndex <= 0) {
			freeTerms.push(normalizeText(token));
			continue;
		}

		const key = normalizeText(
			token.slice(0, separatorIndex),
		) as FieldSearchKey;
		const value = token.slice(separatorIndex + 1).trim();

		if (!value || !validKeys.has(key)) {
			freeTerms.push(normalizeText(token));
			continue;
		}

		fieldTerms.push({ key, value: normalizeText(value) });
	}

	return { freeTerms, fieldTerms };
}

function matchesAgeExpression(age: number | null, expression: string): boolean {
	if (age === null) {
		return false;
	}

	const compact = expression.replace(/\s+/g, "");
	const rangeMatch = compact.match(/^(\d+)-(\d+)$/);
	if (rangeMatch) {
		const min = Number(rangeMatch[1]);
		const max = Number(rangeMatch[2]);
		return age >= min && age <= max;
	}

	const comparatorMatch = compact.match(/^(<=|>=|<|>)(\d+)$/);
	if (comparatorMatch) {
		const operator = comparatorMatch[1];
		const value = Number(comparatorMatch[2]);

		switch (operator) {
			case "<":
				return age < value;
			case "<=":
				return age <= value;
			case ">":
				return age > value;
			case ">=":
				return age >= value;
			default:
				return false;
		}
	}

	if (/^\d+$/.test(compact)) {
		return age === Number(compact);
	}

	return false;
}

function matchesFieldTerm(
	patient: Patient,
	key: FieldSearchKey,
	value: string,
): boolean {
	const normalizedValue = normalizeText(value);

	switch (key) {
		case "id":
			return normalizeText(patient.id).includes(normalizedValue);
		case "name":
			return normalizeText(patient.full_name).includes(normalizedValue);
		case "phone":
			return normalizeText(patient.phone).includes(normalizedValue);
		case "email":
			return normalizeText(patient.email).includes(normalizedValue);
		case "status":
			return normalizeStatusValue(patient.enrollment_status).includes(
				normalizeStatusValue(normalizedValue),
			);
		case "gender":
			return normalizeGenderValue(patient.gender).includes(
				normalizeGenderValue(normalizedValue),
			);
		case "age":
			return matchesAgeExpression(patient.age, normalizedValue);
		case "dob":
			return normalizeText(patient.dob).includes(normalizedValue);
		case "disease":
			return normalizeText(patient.disease).includes(normalizedValue);
		case "trial":
			return normalizeText(patient.trial).includes(normalizedValue);
		default:
			return false;
	}
}

type AgeFilter = "all" | "under18" | "18to40" | "41to60" | "61plus";

export default function AllPatients({
	onLogout,
	currentUser,
}: {
	onLogout?: () => void;
	currentUser: AuthUser | null;
}) {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [error, setError] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [genderFilter, setGenderFilter] = useState<string>("all");
	const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
	const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);
	const [importPreview, setImportPreview] =
		useState<ImportPreviewResponse | null>(null);
	const [importError, setImportError] = useState("");
	const [importMessage, setImportMessage] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [backupError, setBackupError] = useState("");
	const [backupMessage, setBackupMessage] = useState("");
	const [restorePayload, setRestorePayload] = useState<object | null>(null);
	const [isRestoring, setIsRestoring] = useState(false);

	const canCreatePatients = Boolean(
		currentUser && hasPermission(currentUser.role, "patients:create"),
	);
	const canRestoreData = Boolean(
		currentUser && hasPermission(currentUser.role, "patients:delete"),
	);

	useEffect(() => {
		async function loadPatients() {
			try {
				const res = await fetchWithAuth(
					"/api/patients",
					{},
					currentUser,
				);
				if (!res.ok) {
					throw new Error("Request failed");
				}

				const data = (await res.json()) as Patient[];
				setPatients(data);
			} catch {
				setError("Could not load patient records.");
			}
		}

		void loadPatients();
	}, [currentUser]);

	const statusOptions = useMemo(() => {
		const values = new Set(
			patients.map((patient) =>
				patient.enrollment_status.trim().toLowerCase(),
			),
		);

		return Array.from(values).filter(Boolean).sort();
	}, [patients]);

	const genderOptions = useMemo(() => {
		const values = new Set(
			patients
				.map((patient) => patient.gender.trim())
				.filter((value) => value && value.toLowerCase() !== "unknown"),
		);

		return Array.from(values).sort((a, b) => a.localeCompare(b));
	}, [patients]);

	const filteredPatients = useMemo(() => {
		const parsedQuery = parseSearchQuery(searchQuery);

		return patients.filter((patient) => {
			const searchableContent = normalizeText(
				[
					patient.id,
					patient.full_name,
					patient.phone,
					patient.email,
					patient.dob,
					patient.age ?? "",
					patient.gender,
					patient.blood_group,
					patient.disease,
					patient.trial,
					patient.enrollment_status,
				]
					.filter(Boolean)
					.join(" "),
			);

			const matchesFreeTerms = parsedQuery.freeTerms.every((term) =>
				searchableContent.includes(term),
			);

			const matchesFieldTerms = parsedQuery.fieldTerms.every((term) =>
				matchesFieldTerm(patient, term.key, term.value),
			);

			const matchesQuery = matchesFreeTerms && matchesFieldTerms;

			const matchesStatus =
				statusFilter === "all" ||
				normalizeText(patient.enrollment_status) === statusFilter;

			const matchesGender =
				genderFilter === "all" ||
				normalizeText(patient.gender) === genderFilter;

			const age = patient.age;
			const matchesAge =
				ageFilter === "all" ||
				(ageFilter === "under18" && age !== null && age < 18) ||
				(ageFilter === "18to40" &&
					age !== null &&
					age >= 18 &&
					age <= 40) ||
				(ageFilter === "41to60" &&
					age !== null &&
					age >= 41 &&
					age <= 60) ||
				(ageFilter === "61plus" && age !== null && age >= 61);

			return matchesQuery && matchesStatus && matchesGender && matchesAge;
		});
	}, [patients, searchQuery, statusFilter, genderFilter, ageFilter]);

	const hasActiveFilters =
		searchQuery.trim() ||
		statusFilter !== "all" ||
		genderFilter !== "all" ||
		ageFilter !== "all";

	function clearFilters() {
		setSearchQuery("");
		setStatusFilter("all");
		setGenderFilter("all");
		setAgeFilter("all");
	}

	function downloadBlob(
		content: string,
		fileName: string,
		contentType: string,
	) {
		const blob = new Blob([content], { type: contentType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function exportFilteredPatientsToCsv() {
		const headers = [
			"id",
			"full_name",
			"dob",
			"age",
			"gender",
			"phone",
			"email",
			"height",
			"weight",
			"blood_group",
			"disease",
			"trial",
			"enrollment_status",
			"created_at",
		];

		const csvRows = [headers.join(",")];
		for (const patient of filteredPatients) {
			csvRows.push(
				[
					patient.id,
					patient.full_name,
					patient.dob,
					patient.age,
					patient.gender,
					patient.phone,
					patient.email,
					patient.height,
					patient.weight,
					patient.blood_group,
					patient.disease,
					patient.trial,
					patient.enrollment_status,
					patient.created_at,
				]
					.map((value) => csvEscape(value))
					.join(","),
			);
		}

		downloadBlob(
			csvRows.join("\n"),
			`patients-export-${new Date().toISOString().slice(0, 10)}.csv`,
			"text/csv;charset=utf-8",
		);
	}

	function exportFilteredPatientsToPdf() {
		const printWindow = window.open("", "_blank", "noopener,noreferrer");
		if (!printWindow) {
			setBackupError(
				"Could not open print window. Please allow pop-ups.",
			);
			return;
		}

		const rowsHtml = filteredPatients
			.map(
				(patient) => `
				<tr>
					<td>${patient.id}</td>
					<td>${patient.full_name}</td>
					<td>${patient.dob}</td>
					<td>${patient.age ?? "-"}</td>
					<td>${prettyGender(patient.gender)}</td>
					<td>${patient.phone}</td>
					<td>${patient.email}</td>
					<td>${prettyStatus(patient.enrollment_status)}</td>
				</tr>
			`,
			)
			.join("");

		printWindow.document.write(`
			<!doctype html>
			<html>
				<head>
					<title>Patients Export</title>
					<style>
						body { font-family: Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; }
						h1 { margin-bottom: 4px; }
						p { margin-top: 0; color: #475569; }
						table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 12px; }
						th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
						th { background: #f1f5f9; }
					</style>
				</head>
				<body>
					<h1>Patient Records Export</h1>
					<p>Generated ${new Date().toLocaleString()} | ${filteredPatients.length} records</p>
					<table>
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>DOB</th>
								<th>Age</th>
								<th>Gender</th>
								<th>Phone</th>
								<th>Email</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>${rowsHtml}</tbody>
					</table>
				</body>
			</html>
		`);

		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	}

	async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
		setImportError("");
		setImportMessage("");
		setImportPreview(null);
		setImportRecords([]);

		const file = event.target.files && event.target.files[0];
		if (!file) {
			return;
		}

		try {
			const fileText = await file.text();
			const parsedRecords = parseImportCsv(fileText);

			const response = await fetchWithAuth(
				"/api/patients/import/preview",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ records: parsedRecords }),
				},
				currentUser,
			);

			if (!response.ok) {
				const body = (await response
					.json()
					.catch(() => ({}))) as ApiErrorBody;
				throw new Error(body.details || body.error || "Preview failed");
			}

			const preview = (await response.json()) as ImportPreviewResponse;
			setImportRecords(parsedRecords);
			setImportPreview(preview);
			setImportMessage(
				`Preview ready: ${preview.summary.valid} valid and ${preview.summary.invalid} invalid rows.`,
			);
		} catch (err) {
			setImportError(
				err instanceof Error
					? err.message
					: "Could not parse import file.",
			);
		}
	}

	async function commitImport() {
		if (!importRecords.length) {
			setImportError("Select a CSV file and preview it first.");
			return;
		}

		setIsImporting(true);
		setImportError("");
		setImportMessage("");

		try {
			const response = await fetchWithAuth(
				"/api/patients/import/commit",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ records: importRecords }),
				},
				currentUser,
			);

			if (!response.ok) {
				const body = (await response
					.json()
					.catch(() => ({}))) as ApiErrorBody;
				throw new Error(body.details || body.error || "Import failed");
			}

			const result = (await response.json()) as ImportCommitResponse;
			const inserted = result.summary ? result.summary.inserted : 0;
			const rejected = result.summary ? result.summary.rejected : 0;
			setImportMessage(
				`Import complete: ${inserted} inserted, ${rejected} rejected.`,
			);
			setImportRecords([]);
			setImportPreview(null);

			const patientResponse = await fetchWithAuth(
				"/api/patients",
				{},
				currentUser,
			);
			if (patientResponse.ok) {
				const updatedPatients =
					(await patientResponse.json()) as Patient[];
				setPatients(updatedPatients);
			}
		} catch (err) {
			setImportError(
				err instanceof Error
					? err.message
					: "Could not import records.",
			);
		} finally {
			setIsImporting(false);
		}
	}

	async function downloadBackup() {
		setBackupError("");
		setBackupMessage("");

		try {
			const response = await fetchWithAuth(
				"/api/system/backup",
				{},
				currentUser,
			);

			if (!response.ok) {
				const body = (await response
					.json()
					.catch(() => ({}))) as ApiErrorBody;
				throw new Error(body.details || body.error || "Backup failed");
			}

			const payload = await response.json();
			downloadBlob(
				JSON.stringify(payload, null, 2),
				`ctpms-backup-${new Date().toISOString().slice(0, 10)}.json`,
				"application/json;charset=utf-8",
			);
			setBackupMessage("Backup downloaded successfully.");
		} catch (err) {
			setBackupError(
				err instanceof Error ? err.message : "Could not create backup.",
			);
		}
	}

	async function handleRestoreFile(event: ChangeEvent<HTMLInputElement>) {
		setBackupError("");
		setBackupMessage("");

		const file = event.target.files && event.target.files[0];
		if (!file) {
			setRestorePayload(null);
			return;
		}

		try {
			const text = await file.text();
			const parsed = JSON.parse(text) as object;
			setRestorePayload(parsed);
			setBackupMessage(
				"Restore file loaded. Review and confirm restore.",
			);
		} catch {
			setRestorePayload(null);
			setBackupError("Restore file must be a valid JSON backup.");
		}
	}

	async function runRestore() {
		if (!restorePayload) {
			setBackupError("Choose a backup JSON file before restoring.");
			return;
		}

		if (
			!window.confirm(
				"This will replace all current system data. Continue restore?",
			)
		) {
			return;
		}

		setIsRestoring(true);
		setBackupError("");
		setBackupMessage("");

		try {
			const response = await fetchWithAuth(
				"/api/system/restore",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(restorePayload),
				},
				currentUser,
			);

			if (!response.ok) {
				const body = (await response
					.json()
					.catch(() => ({}))) as ApiErrorBody;
				throw new Error(body.details || body.error || "Restore failed");
			}

			setBackupMessage("Restore completed successfully.");
			setRestorePayload(null);

			const patientResponse = await fetchWithAuth(
				"/api/patients",
				{},
				currentUser,
			);
			if (patientResponse.ok) {
				const restoredPatients =
					(await patientResponse.json()) as Patient[];
				setPatients(restoredPatients);
			}
		} catch (err) {
			setBackupError(
				err instanceof Error
					? err.message
					: "Could not restore backup.",
			);
		} finally {
			setIsRestoring(false);
		}
	}

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-slate-800">
						All Active Patient Records
					</h1>
					{onLogout && (
						<button
							onClick={onLogout}
							className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
						>
							Logout
						</button>
					)}
				</div>

				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<div className="mb-5 flex items-center justify-between gap-3">
						<h2 className="text-xl font-bold text-slate-800">
							Patient Records
						</h2>
						<Link
							to="/"
							className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-700 dark:hover:text-white"
						>
							← Back
						</Link>
					</div>

					<div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
								Data Export / Import
							</h3>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={exportFilteredPatientsToCsv}
									className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Export CSV
								</button>
								<button
									type="button"
									onClick={exportFilteredPatientsToPdf}
									className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Export PDF
								</button>
							</div>
						</div>

						<div className="mt-4 grid gap-4 lg:grid-cols-2">
							<div className="rounded-xl border border-slate-200 bg-white p-3">
								<p className="text-sm font-semibold text-slate-700">
									Import Patient Records (CSV)
								</p>
								<p className="mt-1 text-xs text-slate-500">
									Required columns: fullName, dob, gender,
									phone, email, heightCm, weightKg,
									bloodGroup.
								</p>
								<input
									type="file"
									accept=".csv,text/csv"
									onChange={handleImportFile}
									disabled={!canCreatePatients || isImporting}
									className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
								/>
								<div className="mt-3 flex items-center justify-between gap-3">
									<button
										type="button"
										onClick={commitImport}
										disabled={
											!canCreatePatients ||
											!importPreview ||
											importPreview.summary.valid === 0 ||
											isImporting
										}
										className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isImporting
											? "Importing..."
											: "Import Valid Records"}
									</button>
									{importPreview && (
										<span className="text-xs text-slate-600">
											{importPreview.summary.valid} valid
											/ {importPreview.summary.invalid}{" "}
											invalid
										</span>
									)}
								</div>
								{importMessage && (
									<p className="mt-2 text-xs text-emerald-700">
										{importMessage}
									</p>
								)}
								{importError && (
									<p className="mt-2 text-xs text-red-700">
										{importError}
									</p>
								)}
							</div>

							<div className="rounded-xl border border-slate-200 bg-white p-3">
								<p className="text-sm font-semibold text-slate-700">
									Backup / Restore
								</p>
								<p className="mt-1 text-xs text-slate-500">
									Create a full JSON backup or restore from a
									backup file.
								</p>
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={downloadBackup}
										disabled={
											!canRestoreData || isRestoring
										}
										className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Download Backup
									</button>
									<input
										type="file"
										accept="application/json,.json"
										onChange={handleRestoreFile}
										disabled={
											!canRestoreData || isRestoring
										}
										className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
									/>
									<button
										type="button"
										onClick={runRestore}
										disabled={
											!canRestoreData ||
											!restorePayload ||
											isRestoring
										}
										className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isRestoring
											? "Restoring..."
											: "Restore Backup"}
									</button>
								</div>
								{backupMessage && (
									<p className="mt-2 text-xs text-emerald-700">
										{backupMessage}
									</p>
								)}
								{backupError && (
									<p className="mt-2 text-xs text-red-700">
										{backupError}
									</p>
								)}
							</div>
						</div>

						{importPreview && (
							<div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
									Import Validation Preview
								</p>
								<div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
									<table className="min-w-full divide-y divide-slate-200 text-xs">
										<thead className="bg-slate-50 text-left text-slate-600">
											<tr>
												<th className="px-2 py-2">
													Row
												</th>
												<th className="px-2 py-2">
													Name
												</th>
												<th className="px-2 py-2">
													Email
												</th>
												<th className="px-2 py-2">
													Status
												</th>
												<th className="px-2 py-2">
													Details
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{importPreview.rows.map((row) => (
												<tr key={row.index}>
													<td className="px-2 py-2 text-slate-500">
														{row.index}
													</td>
													<td className="px-2 py-2 text-slate-700">
														{row.record.fullName}
													</td>
													<td className="px-2 py-2 text-slate-700">
														{row.record.email}
													</td>
													<td className="px-2 py-2">
														<span
															className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
																row.valid
																	? "bg-emerald-100 text-emerald-700"
																	: "bg-red-100 text-red-700"
															}`}
														>
															{row.valid
																? "Valid"
																: "Invalid"}
														</span>
													</td>
													<td className="px-2 py-2 text-slate-600">
														{row.errors.length
															? row.errors.join(
																	"; ",
																)
															: "-"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>

					<div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-5">
						<label className="text-sm font-medium text-slate-700 md:col-span-2 lg:col-span-2">
							Search
							<input
								type="text"
								value={searchQuery}
								onChange={(event) =>
									setSearchQuery(event.target.value)
								}
								placeholder="Name, phone, or patient ID"
								className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							/>
							<span className="mt-1 block text-xs font-normal text-slate-500">
								Try: name:&quot;Jane Doe&quot; status:enrolled
								age:&gt;40 trial:cardio
							</span>
						</label>

						<label className="text-sm font-medium text-slate-700">
							Status
							<select
								value={statusFilter}
								onChange={(event) =>
									setStatusFilter(event.target.value)
								}
								className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							>
								<option value="all">All</option>
								{statusOptions.map((status) => (
									<option key={status} value={status}>
										{prettyStatus(status)}
									</option>
								))}
							</select>
						</label>

						<label className="text-sm font-medium text-slate-700">
							Gender
							<select
								value={genderFilter}
								onChange={(event) =>
									setGenderFilter(event.target.value)
								}
								className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							>
								<option value="all">All</option>
								{genderOptions.map((gender) => (
									<option
										key={gender}
										value={gender.toLowerCase()}
									>
										{gender}
									</option>
								))}
							</select>
						</label>

						<label className="text-sm font-medium text-slate-700">
							Age
							<select
								value={ageFilter}
								onChange={(event) =>
									setAgeFilter(
										event.target.value as AgeFilter,
									)
								}
								className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							>
								<option value="all">All</option>
								<option value="under18">Under 18</option>
								<option value="18to40">18 to 40</option>
								<option value="41to60">41 to 60</option>
								<option value="61plus">61+</option>
							</select>
						</label>

						<div className="flex items-end">
							<button
								type="button"
								onClick={clearFilters}
								disabled={!hasActiveFilters}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Clear filters
							</button>
						</div>
					</div>

					<div className="mb-4 text-sm text-slate-600">
						Showing {filteredPatients.length} of {patients.length}{" "}
						patients
					</div>

					{error ? (
						<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					) : patients.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							No patient records found.
						</div>
					) : filteredPatients.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							No patients match the current search and filters.
						</div>
					) : (
						<div className="max-h-[calc(100vh-250px)] overflow-y-auto">
							<ul className="grid grid-cols-1 gap-4 pr-3 sm:grid-cols-2">
								{filteredPatients.map((patient) => (
									<li key={patient.id}>
										<Link
											to={`/patients/${patient.id}`}
											className="patient-card block h-56 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:border-teal-300 hover:shadow-lg hover:ring-1 hover:ring-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
										>
											<div className="flex h-full flex-col gap-6">
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
															Patient #
															{patient.id}
														</p>
														<h3 className="mt-2 text-xl font-bold leading-snug text-slate-800">
															{patient.full_name}
														</h3>
													</div>
													<span
														className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClasses(
															patient.enrollment_status,
														)}`}
													>
														{prettyStatus(
															patient.enrollment_status,
														)}
													</span>
												</div>

												<div className="mt-auto grid grid-cols-1 gap-2 text-sm text-slate-600">
													<p>
														<span className="font-semibold text-slate-700">
															Age:
														</span>{" "}
														{patient.age ?? "-"}
													</p>
													<p>
														<span className="font-semibold text-slate-700">
															Gender:
														</span>{" "}
														{prettyGender(
															patient.gender,
														)}
													</p>
												</div>
											</div>
										</Link>
									</li>
								))}
							</ul>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
