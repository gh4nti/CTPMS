import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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

interface PatientProfileProps {
	onLogout?: () => void;
}

export default function PatientProfile({ onLogout }: PatientProfileProps) {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [patient, setPatient] = useState<Patient | null>(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [updateMessage, setUpdateMessage] = useState("");
	const [updateError, setUpdateError] = useState("");

	async function loadPatientProfile() {
		setIsLoading(true);
		setError("");

		try {
			const res = await fetch(`/patients/${id}`);
			if (res.status === 404) {
				setError("Patient not found.");
				setPatient(null);
				return;
			}

			if (!res.ok) {
				throw new Error("Request failed");
			}

			const data = (await res.json()) as Patient;
			setPatient(data);
		} catch {
			setError("Could not load patient profile.");
			setPatient(null);
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

		void loadPatientProfile();
	}, [id]);

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
			setIsEditing(false);
			await loadPatientProfile();
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
		setIsEditing(false);
		setUpdateMessage("");
		setUpdateError("");
	}

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							{isEditing ? "Edit" : "Patient"} Profile
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							{patient
								? patient.full_name
								: `Patient #${id || "-"}`}
						</h1>
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
								className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
							>
								Home
							</Link>
							<Link
								to="/all-patients"
								className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
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
								<button
									onClick={() => setIsEditing(true)}
									className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
								>
									Edit Patient
								</button>
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
										}}
										onSubmit={handleFormSubmit}
										onCancel={handleCancel}
										isLoading={isLoading}
									/>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
									<h2 className="mb-4 text-lg font-bold text-slate-800">
										Basic Information
									</h2>
									<div className="space-y-2 text-sm text-slate-600">
										<p>
											<span className="font-semibold text-slate-700">
												Patient ID:
											</span>{" "}
											{patient.id}
										</p>
										<p>
											<span className="font-semibold text-slate-700">
												Name:
											</span>{" "}
											{patient.full_name}
										</p>
										<p>
											<span className="font-semibold text-slate-700">
												DOB:
											</span>{" "}
											{patient.dob}
										</p>
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
											{prettyGender(patient.gender)}
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
												Blood Group:
											</span>{" "}
											{patient.blood_group || "-"}
										</p>
										<p>
											<span className="font-semibold text-slate-700">
												Disease:
											</span>{" "}
											{patient.disease || "-"}
										</p>
										<p>
											<span className="font-semibold text-slate-700">
												Trial:
											</span>{" "}
											{patient.trial || "-"}
										</p>
									</div>
								</div>
							</div>
						)
					) : null}
				</section>
			</div>
		</main>
	);
}
