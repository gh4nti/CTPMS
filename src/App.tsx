import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type EnrollmentStatus = "screening" | "eligible" | "enrolled" | "hold";

interface Patient {
	id: number;
	full_name: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	height: number | null;
	weight: number | null;
	blood_group: string;
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

interface FormState {
	fullName: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	heightCm: string;
	weightKg: string;
	bloodGroup: string;
}

const initialForm: FormState = {
	fullName: "",
	dob: "",
	gender: "",
	phone: "",
	email: "",
	heightCm: "",
	weightKg: "",
	bloodGroup: "",
};

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

export default function App() {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [form, setForm] = useState<FormState>(initialForm);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

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

	function updateField(
		event: ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
	}

	function hasRequiredFields() {
		return (
			form.fullName.trim() &&
			form.dob.trim() &&
			form.gender.trim() &&
			form.phone.trim() &&
			form.email.trim() &&
			form.heightCm.trim() &&
			form.weightKg.trim() &&
			form.bloodGroup.trim()
		);
	}

	async function submitForm(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!hasRequiredFields()) {
			setIsError(true);
			setMessage("Please fill in all required patient fields.");
			return;
		}

		setIsSaving(true);
		setIsError(false);
		setMessage("Saving patient record...");

		try {
			const payload = {
				fullName: form.fullName.trim(),
				dob: form.dob.trim(),
				gender: form.gender.trim(),
				phone: form.phone.trim(),
				email: form.email.trim(),
				heightCm: form.heightCm.trim(),
				weightKg: form.weightKg.trim(),
				bloodGroup: form.bloodGroup.trim(),
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
			setForm(initialForm);
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
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<div className="mb-7">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Clinical Trial Patient Management
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							Enroll Patient
						</h1>
						<p className="mt-2 max-w-3xl text-slate-600">
							Capture enrollment-ready patient records and store
							them with automatic status assignment.
						</p>
					</div>

					<form onSubmit={submitForm} className="space-y-5">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<label className="text-sm font-medium text-slate-700">
								Full name
								<input
									type="text"
									name="fullName"
									value={form.fullName}
									onChange={updateField}
									placeholder="Jane Doe"
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Date of birth
								<input
									type="date"
									name="dob"
									value={form.dob}
									onChange={updateField}
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Gender
								<select
									name="gender"
									value={form.gender}
									onChange={updateField}
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								>
									<option value="" disabled>
										Select gender
									</option>
									<option value="female">Female</option>
									<option value="male">Male</option>
									<option value="non-binary">
										Non-binary
									</option>
									<option value="prefer-not-to-say">
										Prefer not to say
									</option>
								</select>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Phone number
								<input
									type="tel"
									name="phone"
									value={form.phone}
									onChange={updateField}
									placeholder="+1 555 123 4567"
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Email
								<input
									type="email"
									name="email"
									value={form.email}
									onChange={updateField}
									placeholder="jane.doe@example.com"
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Height (cm)
								<input
									type="number"
									name="heightCm"
									value={form.heightCm}
									onChange={updateField}
									placeholder="170"
									min="1"
									step="0.1"
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Weight (kg)
								<input
									type="number"
									name="weightKg"
									value={form.weightKg}
									onChange={updateField}
									placeholder="65"
									min="1"
									step="0.1"
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								/>
							</label>

							<label className="text-sm font-medium text-slate-700">
								Blood group
								<select
									name="bloodGroup"
									value={form.bloodGroup}
									onChange={updateField}
									required
									className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
								>
									<option value="" disabled>
										Select blood group
									</option>
									<option value="A+">A+</option>
									<option value="A-">A-</option>
									<option value="B+">B+</option>
									<option value="B-">B-</option>
									<option value="AB+">AB+</option>
									<option value="AB-">AB-</option>
									<option value="O+">O+</option>
									<option value="O-">O-</option>
								</select>
							</label>

							<div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 sm:col-span-2">
								Patient ID is assigned automatically from
								existing patient records.
							</div>
						</div>

						<div className="flex items-center justify-between gap-3">
							<button
								type="submit"
								disabled={isSaving}
								className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
							>
								{isSaving ? "Saving..." : "Add patient record"}
							</button>
							<p
								className={`text-sm ${isError ? "text-red-600" : "text-slate-600"}`}
							>
								{message}
							</p>
						</div>
					</form>
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
							<ul className="space-y-4">
								{patients.slice(0, 5).map((patient) => (
									<li
										key={patient.id}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
									>
										<div className="mb-3 flex items-center justify-between gap-3">
											<span className="text-base font-semibold text-slate-800">
												#{patient.id} -{" "}
												{patient.full_name}
											</span>
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
										<div className="grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
											<div>
												<span className="font-medium text-slate-700">
													DOB:
												</span>{" "}
												{patient.dob}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Gender:
												</span>{" "}
												{patient.gender}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Phone:
												</span>{" "}
												{patient.phone || "-"}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Email:
												</span>{" "}
												{patient.email || "-"}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Height:
												</span>{" "}
												{patient.height
													? `${patient.height} cm`
													: "-"}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Weight:
												</span>{" "}
												{patient.weight
													? `${patient.weight} kg`
													: "-"}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Blood Group:
												</span>{" "}
												{patient.blood_group || "-"}
											</div>
										</div>
									</li>
								))}
							</ul>
							{patients.length > 5 && (
								<Link
									to="/all-patients"
									className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
								>
									Show More ({patients.length - 5} more)
								</Link>
							)}
						</>
					)}
				</section>
			</div>
		</main>
	);
}
