import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import PatientForm, { FormState } from "./PatientForm";

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

const ARCHIVE_STORAGE_KEY = "ctpms_archived_patients";

interface ClinicalVisit {
	id: number;
	title: string;
	date: string;
	value: number;
	unit: string;
	interpretation: string;
}

interface ClinicalMedication {
	id: number;
	name: string;
	class: string;
	dosage: string;
	start_date: string;
	end_date: string | null;
	current_status: string;
}

interface ClinicalRecordNote {
	id: string;
	title: string;
	body: string;
	date: string;
}

interface ClinicalRecords {
	medications: ClinicalMedication[];
	visits: ClinicalVisit[];
	notes: ClinicalRecordNote[];
	allergies: string[];
}

const emptyClinicalRecords: ClinicalRecords = {
	medications: [],
	visits: [],
	notes: [],
	allergies: [],
};

function formatDisplayDate(value: string): string {
	if (!value) {
		return "-";
	}

	const parsedDate = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(parsedDate);
}

function readArchivedPatientIds(): number[] {
	if (typeof window === "undefined") {
		return [];
	}

	const rawValue = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
	if (!rawValue) {
		return [];
	}

	try {
		const parsed = JSON.parse(rawValue) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value > 0);
	} catch {
		return [];
	}
}

function writeArchivedPatientIds(patientIds: number[]) {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		ARCHIVE_STORAGE_KEY,
		JSON.stringify(Array.from(new Set(patientIds))),
	);
}

function formatMedicationDates(startDate: string, endDate: string | null) {
	const startLabel = formatDisplayDate(startDate);
	const endLabel = endDate ? formatDisplayDate(endDate) : "Present";
	return `${startLabel} to ${endLabel}`;
}

interface PatientProfileProps {
	onLogout?: () => void;
}

export default function PatientProfile({ onLogout }: PatientProfileProps) {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const isEditing = location.pathname.endsWith("/edit");
	const [patient, setPatient] = useState<Patient | null>(null);
	const [records, setRecords] =
		useState<ClinicalRecords>(emptyClinicalRecords);
	const [error, setError] = useState("");
	const [recordsError, setRecordsError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [updateMessage, setUpdateMessage] = useState("");
	const [updateError, setUpdateError] = useState("");
	const [isArchived, setIsArchived] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	async function loadPatientProfile() {
		setIsLoading(true);
		setError("");
		setRecordsError("");

		try {
			if (!id) {
				setError("Patient not found.");
				setPatient(null);
				setRecords(emptyClinicalRecords);
				return;
			}

			const res = await fetch(`/patients/${id}`);
			if (res.status === 404) {
				setError("Patient not found.");
				setPatient(null);
				setRecords(emptyClinicalRecords);
				return;
			}

			if (!res.ok) {
				throw new Error("Request failed");
			}

			const data = (await res.json()) as Patient;
			setPatient(data);

			const recordsResponse = await fetch(`/patients/${id}/records`);
			if (recordsResponse.ok) {
				const recordData =
					(await recordsResponse.json()) as ClinicalRecords;
				setRecords({
					medications: recordData.medications || [],
					visits: recordData.visits || [],
					notes: recordData.notes || [],
					allergies: recordData.allergies || [],
				});
			} else if (recordsResponse.status === 404) {
				setRecords(emptyClinicalRecords);
				setRecordsError(
					"Clinical records were not found for this patient.",
				);
			} else {
				setRecords(emptyClinicalRecords);
				setRecordsError("Could not load clinical records.");
			}
		} catch {
			setError("Could not load patient profile.");
			setPatient(null);
			setRecords(emptyClinicalRecords);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (!id) {
			setError("Patient not found.");
			setIsLoading(false);
			return;
		}

		setIsArchived(readArchivedPatientIds().includes(Number(id)));
		void loadPatientProfile();
	}, [id]);

	function handleToggleArchive() {
		if (!id) {
			return;
		}

		const patientId = Number(id);
		if (!Number.isInteger(patientId) || patientId <= 0) {
			return;
		}

		const archivedPatientIds = readArchivedPatientIds();
		const nextArchivedIds = archivedPatientIds.includes(patientId)
			? archivedPatientIds.filter((value) => value !== patientId)
			: [...archivedPatientIds, patientId];

		writeArchivedPatientIds(nextArchivedIds);
		setIsArchived(nextArchivedIds.includes(patientId));
	}

	function handleScheduleAppointment() {
		if (!patient) {
			return;
		}

		if (patient.email) {
			const subject = encodeURIComponent(
				`Appointment request for ${patient.full_name}`,
			);
			const body = encodeURIComponent(
				`Hello ${patient.full_name},\n\nWe would like to schedule your next appointment.`,
			);
			window.location.href = `mailto:${patient.email}?subject=${subject}&body=${body}`;
			return;
		}

		if (patient.phone) {
			window.location.href = `tel:${patient.phone.replace(/[^\d+]/g, "")}`;
			return;
		}

		setUpdateError(
			"No contact details available to schedule an appointment.",
		);
	}

	async function handleDeletePatient() {
		if (!patient || !id) {
			return;
		}

		const confirmed = window.confirm(
			`Delete patient ${patient.full_name}? This will remove the patient and related records.`,
		);

		if (!confirmed) {
			return;
		}

		setIsDeleting(true);
		setUpdateError("");

		try {
			const response = await fetch(`/patients/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorBody = (await response
					.json()
					.catch(() => ({}))) as Record<string, string>;
				throw new Error(errorBody.error || "Request failed");
			}

			const archivedPatientIds = readArchivedPatientIds().filter(
				(value) => value !== Number(id),
			);
			writeArchivedPatientIds(archivedPatientIds);
			navigate("/all-patients");
		} catch (err) {
			setUpdateError(
				err instanceof Error
					? err.message
					: "An error occurred while deleting the patient",
			);
		} finally {
			setIsDeleting(false);
		}
	}

	async function handleFormSubmit(data: FormState) {
		setUpdateError("");
		setUpdateMessage("Updating patient...");

		try {
			const payload = {
				fullName: data.fullName.trim(),
				dob: data.dob.trim(),
				gender: data.gender.trim(),
				phone: data.phone.trim(),
				email: data.email.trim(),
				heightCm: data.heightCm.trim(),
				weightKg: data.weightKg.trim(),
				bloodGroup: data.bloodGroup.trim(),
				enrollmentStatus: data.enrollmentStatus.trim(),
			};

			const response = await fetch(`/patients/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorBody = (await response
					.json()
					.catch(() => ({}))) as Record<string, string>;
				const detailSuffix = errorBody.details
					? ` (${errorBody.details})`
					: "";
				throw new Error(
					`${errorBody.error || "Request failed"}${detailSuffix}`,
				);
			}

			setUpdateMessage("Patient updated successfully!");
			await loadPatientProfile();
			navigate(`/patients/${id}`);
		} catch (err) {
			setUpdateError(
				err instanceof Error
					? err.message
					: "An error occurred while updating",
			);
			throw err;
		}
	}

	function handleCancel() {
		navigate(`/patients/${id}`);
		setUpdateMessage("");
		setUpdateError("");
	}

	const canUseClinicalActions = Boolean(patient);

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Single Patient Profile
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							{patient
								? patient.full_name
								: `Patient #${id || "-"}`}
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Visit history, notes, medications, allergies, and
							quick actions for the selected patient.
						</p>
					</div>
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
					<div className="mb-6 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Link
								to="/"
								className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-700 dark:hover:text-white"
							>
								Home
							</Link>
							<Link
								to="/all-patients"
								className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-700 dark:hover:text-white"
							>
								All Patients
							</Link>
						</div>
						{patient && !isEditing && (
							<div className="flex items-center gap-3">
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClasses(
										patient.enrollment_status,
									)}`}
								>
									{prettyStatus(patient.enrollment_status)}
								</span>
								{isArchived && (
									<span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
										Archived
									</span>
								)}
							</div>
						)}
					</div>

					{isLoading ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							Loading patient profile...
						</div>
					) : error ? (
						<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					) : patient ? (
						isEditing ? (
							<div className="space-y-6">
								{updateMessage && (
									<div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
										{updateMessage}
									</div>
								)}
								{updateError && (
									<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
										{updateError}
									</div>
								)}
								<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
									<h2 className="mb-6 text-lg font-bold text-slate-800">
										Edit Patient Information
									</h2>
									<PatientForm
										mode="edit"
										initialData={{
											fullName: patient.full_name,
											dob: patient.dob,
											gender: patient.gender,
											phone: patient.phone,
											email: patient.email,
											heightCm: String(
												patient.height || "",
											),
											weightKg: String(
												patient.weight || "",
											),
											bloodGroup: patient.blood_group,
											enrollmentStatus:
												patient.enrollment_status,
										}}
										onSubmit={handleFormSubmit}
										onCancel={handleCancel}
										isLoading={isLoading}
									/>
								</div>
							</div>
						) : (
							<div className="space-y-6">
								{updateMessage && (
									<div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
										{updateMessage}
									</div>
								)}
								{updateError && (
									<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
										{updateError}
									</div>
								)}

								<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
													Overview
												</p>
												<h2 className="mt-2 text-lg font-bold text-slate-800">
													Patient summary
												</h2>
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<span
													className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClasses(
														patient.enrollment_status,
													)}`}
												>
													{prettyStatus(
														patient.enrollment_status,
													)}
												</span>
												{isArchived && (
													<span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
														Archived
													</span>
												)}
											</div>
										</div>

										<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="rounded-xl bg-slate-50 p-4">
												<p className="text-xs uppercase tracking-wide text-slate-500">
													Patient ID
												</p>
												<p className="mt-1 text-base font-semibold text-slate-800">
													{patient.id}
												</p>
											</div>
											<div className="rounded-xl bg-slate-50 p-4">
												<p className="text-xs uppercase tracking-wide text-slate-500">
													Age / Gender
												</p>
												<p className="mt-1 text-base font-semibold text-slate-800">
													{patient.age ?? "-"} /{" "}
													{prettyGender(
														patient.gender,
													)}
												</p>
											</div>
											<div className="rounded-xl bg-slate-50 p-4">
												<p className="text-xs uppercase tracking-wide text-slate-500">
													Disease
												</p>
												<p className="mt-1 text-base font-semibold text-slate-800">
													{patient.disease || "-"}
												</p>
											</div>
											<div className="rounded-xl bg-slate-50 p-4">
												<p className="text-xs uppercase tracking-wide text-slate-500">
													Trial
												</p>
												<p className="mt-1 text-base font-semibold text-slate-800">
													{patient.trial || "-"}
												</p>
											</div>
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
											Quick Actions
										</p>
										<div className="mt-4 flex flex-wrap gap-3">
											<button
												onClick={() =>
													navigate(
														`/patients/${id}/edit`,
													)
												}
												className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
											>
												Edit patient
											</button>
											<button
												onClick={handleToggleArchive}
												className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
											>
												{isArchived
													? "Unarchive"
													: "Archive"}
											</button>
											<button
												onClick={
													handleScheduleAppointment
												}
												disabled={
													!canUseClinicalActions
												}
												className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Schedule appointment
											</button>
											<button
												onClick={() =>
													void handleDeletePatient()
												}
												disabled={isDeleting}
												className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{isDeleting
													? "Deleting..."
													: "Delete patient"}
											</button>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="mb-4 text-lg font-bold text-slate-800">
											Basic Information
										</h2>
										<div className="space-y-2 text-sm text-slate-600">
											<p>
												<span className="font-semibold text-slate-700">
													DOB:
												</span>{" "}
												{formatDisplayDate(patient.dob)}
											</p>
											<p>
												<span className="font-semibold text-slate-700">
													Height:
												</span>{" "}
												{patient.height
													? `${patient.height} cm`
													: "-"}
											</p>
											<p>
												<span className="font-semibold text-slate-700">
													Weight:
												</span>{" "}
												{patient.weight
													? `${patient.weight} kg`
													: "-"}
											</p>
											<p>
												<span className="font-semibold text-slate-700">
													Blood group:
												</span>{" "}
												{patient.blood_group || "-"}
											</p>
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="mb-4 text-lg font-bold text-slate-800">
											Contact & Enrollment
										</h2>
										<div className="space-y-2 text-sm text-slate-600">
											<p>
												<span className="font-semibold text-slate-700">
													Phone:
												</span>{" "}
												{patient.phone || "-"}
											</p>
											<p>
												<span className="font-semibold text-slate-700">
													Email:
												</span>{" "}
												{patient.email || "-"}
											</p>
											<p>
												<span className="font-semibold text-slate-700">
													Created:
												</span>{" "}
												{formatDisplayDate(
													patient.created_at,
												)}
											</p>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="text-lg font-bold text-slate-800">
											Visit history
										</h2>
										<p className="mt-1 text-sm text-slate-500">
											Recent clinical activity captured
											from lab results.
										</p>
										<div className="mt-4 space-y-3">
											{records.visits.length > 0 ? (
												records.visits.map((visit) => (
													<div
														key={visit.id}
														className="rounded-xl border border-slate-200 bg-slate-50 p-4"
													>
														<div className="flex flex-wrap items-start justify-between gap-3">
															<div>
																<p className="font-semibold text-slate-800">
																	{
																		visit.title
																	}
																</p>
																<p className="mt-1 text-sm text-slate-600">
																	{formatDisplayDate(
																		visit.date,
																	)}
																</p>
															</div>
															<div className="text-right text-sm text-slate-600">
																<p className="font-semibold text-slate-800">
																	{
																		visit.value
																	}{" "}
																	{visit.unit}
																</p>
																<p>
																	{
																		visit.interpretation
																	}
																</p>
															</div>
														</div>
													</div>
												))
											) : (
												<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
													No visit history recorded.
												</div>
											)}
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="text-lg font-bold text-slate-800">
											Medications
										</h2>
										<p className="mt-1 text-sm text-slate-500">
											Current and historical medications.
										</p>
										<div className="mt-4 space-y-3">
											{records.medications.length > 0 ? (
												records.medications.map(
													(medication) => (
														<div
															key={medication.id}
															className="rounded-xl border border-slate-200 bg-slate-50 p-4"
														>
															<div className="flex items-start justify-between gap-3">
																<div>
																	<p className="font-semibold text-slate-800">
																		{
																			medication.name
																		}
																	</p>
																	<p className="mt-1 text-sm text-slate-600">
																		{
																			medication.class
																		}
																	</p>
																</div>
																<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
																	{
																		medication.current_status
																	}
																</span>
															</div>
															<p className="mt-3 text-sm text-slate-600">
																{medication.dosage ||
																	"No dosage recorded"}
															</p>
															<p className="mt-1 text-xs text-slate-500">
																{formatMedicationDates(
																	medication.start_date,
																	medication.end_date,
																)}
															</p>
														</div>
													),
												)
											) : (
												<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
													No medications recorded.
												</div>
											)}
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="text-lg font-bold text-slate-800">
											Notes
										</h2>
										<p className="mt-1 text-sm text-slate-500">
											Clinical notes captured for the
											patient.
										</p>
										<div className="mt-4 space-y-3">
											{records.notes.length > 0 ? (
												records.notes.map((note) => (
													<div
														key={note.id}
														className="rounded-xl border border-slate-200 bg-slate-50 p-4"
													>
														<p className="font-semibold text-slate-800">
															{note.title}
														</p>
														<p className="mt-1 text-sm text-slate-600">
															{note.body}
														</p>
														<p className="mt-2 text-xs text-slate-500">
															{formatDisplayDate(
																note.date,
															)}
														</p>
													</div>
												))
											) : (
												<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
													No notes recorded.
												</div>
											)}
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="text-lg font-bold text-slate-800">
											Allergies
										</h2>
										<p className="mt-1 text-sm text-slate-500">
											Known patient allergies or
											sensitivities.
										</p>
										<div className="mt-4 space-y-3">
											{records.allergies.length > 0 ? (
												records.allergies.map(
													(allergy, index) => (
														<div
															key={`${allergy}-${index}`}
															className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
														>
															{allergy}
														</div>
													),
												)
											) : (
												<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
													No allergies recorded.
												</div>
											)}
										</div>
									</div>
								</div>

								{recordsError && (
									<div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
										{recordsError}
									</div>
								)}
							</div>
						)
					) : null}
				</section>
			</div>
		</main>
	);
}
