import { Patient } from "../../types";
import { formatDisplayDate } from "../../formatters";

interface ContactEnrollmentCardProps {
	patient: Patient;
}

export default function ContactEnrollmentCard({
	patient,
}: ContactEnrollmentCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="mb-4 text-lg font-bold text-slate-800">
				Contact & Enrollment
			</h2>
			<div className="space-y-2 text-sm text-slate-600">
				<p>
					<span className="font-semibold text-slate-700">Phone:</span>{" "}
					{patient.phone || "-"}
				</p>
				<p>
					<span className="font-semibold text-slate-700">Email:</span>{" "}
					{patient.email || "-"}
				</p>
				<p>
					<span className="font-semibold text-slate-700">
						Created:
					</span>{" "}
					{formatDisplayDate(patient.created_at)}
				</p>
			</div>
		</div>
	);
}
