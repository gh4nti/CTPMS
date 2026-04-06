import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

interface CreatePatientResponse {
	id: number;
	message: string;
}

interface ApiErrorBody {
	error?: string;
	details?: string;
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

interface AppProps {
	onLogout?: () => void;
}

export default function App({ onLogout }: AppProps) {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);

	const countLabel = useMemo(() => {
		return `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`;
	}, [patients]);

	async function loadPatients() {
		try {
			const res = await fetch("/patients");
			if (!res.ok) {
				throw new Error("Request failed");
			}

			const data = (await res.json()) as Patient[];
			setPatients(data);
		} catch {
			setIsError(true);
			setMessage("Could not load patient records.");
		}
	}

	useEffect(() => {
		void loadPatients();
	}, []);

	async function handleSubmitForm(data: FormState) {
		setIsError(false);
		setMessage("Saving patient record...");

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

			const response = await fetch("/patients", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorBody = (await response
					.json()
					.catch(() => ({}))) as ApiErrorBody;
				const detailSuffix = errorBody.details
					? ` (${errorBody.details})`
					: "";
				throw new Error(
					`${errorBody.error || "Request failed"}${detailSuffix}`,
				);
			}

			const created = (await response
				.json()
				.catch(() => ({}))) as Partial<CreatePatientResponse>;
			setIsError(false);
			setMessage(
				`Patient ${payload.fullName} added successfully with ID ${created.id || "-"}.`,
			);
			await loadPatients();
		} catch (error) {
			setIsError(true);
			setMessage(
				`Could not add patient: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
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

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Clinical Trial Patient Management
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							Admin Dashboard
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
					<div className="mb-7">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Enrollment
						</p>
						<h2 className="mt-3 text-2xl font-bold text-slate-800">
							Enroll Patient
						</h2>
						<p className="mt-2 max-w-3xl text-slate-600">
							Capture enrollment-ready patient records and store
							them with automatic status assignment.
						</p>
					</div>

					{message && (
						<div
							className={`mb-5 rounded-xl px-4 py-3 text-sm ${
								isError
									? "border border-red-300 bg-red-50 text-red-700"
									: "border border-emerald-300 bg-emerald-50 text-emerald-700"
							}`}
						>
							{message}
						</div>
					)}

					<PatientForm mode="create" onSubmit={handleSubmitForm} />
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<div className="mb-5 flex items-center justify-between">
						<h2 className="text-xl font-bold text-slate-800">
							Active Patient Records
						</h2>
						<span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
							{countLabel}
						</span>
					</div>

					{patients.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							No patient records yet. Add the first one above.
						</div>
					) : (
						<>
							<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{patients.slice(0, 6).map((patient) => (
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
							{patients.length > 6 && (
								<Link
									to="/all-patients"
									className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
								>
									Show More ({patients.length - 6} more)
								</Link>
							)}
						</>
					)}
				</section>
			</div>
		</main>
	);
}
