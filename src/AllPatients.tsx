import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type EnrollmentStatus = "screening" | "eligible" | "enrolled" | "hold";

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

export default function AllPatients() {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [error, setError] = useState("");

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

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<div className="mb-5 flex items-center justify-between gap-3">
						<h2 className="text-xl font-bold text-slate-800">
							All Active Patient Records
						</h2>
						<Link
							to="/"
							className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
						>
							← Back
						</Link>
					</div>

					{error ? (
						<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					) : patients.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							No patient records found.
						</div>
					) : (
						<div className="max-h-[calc(100vh-250px)] overflow-y-auto">
							<ul className="space-y-4 pr-3">
								{patients.map((patient) => (
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
													Age:
												</span>{" "}
												{patient.age ?? "-"}
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
											<div>
												<span className="font-medium text-slate-700">
													Disease:
												</span>{" "}
												{patient.disease || "-"}
											</div>
											<div>
												<span className="font-medium text-slate-700">
													Trial:
												</span>{" "}
												{patient.trial || "-"}
											</div>
										</div>
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
