import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

export default function AllPatients({ onLogout }: { onLogout?: () => void }) {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [error, setError] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [genderFilter, setGenderFilter] = useState<string>("all");
	const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");

	useEffect(() => {
		async function loadPatients() {
			try {
				const res = await fetch("/patients");
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
	}, []);

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
