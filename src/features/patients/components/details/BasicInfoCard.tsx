import { Patient } from "../../types";
import { formatDisplayDate } from "../../formatters";

interface BasicInfoCardProps {
	patient: Patient;
}

export default function BasicInfoCard({ patient }: BasicInfoCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="mb-4 text-lg font-bold text-slate-800">
				Basic Information
			</h2>
			<div className="space-y-2 text-sm text-slate-600">
				<p>
					<span className="font-semibold text-slate-700">DOB:</span>{" "}
					{formatDisplayDate(patient.dob)}
				</p>
				<p>
					<span className="font-semibold text-slate-700">
						Height:
					</span>{" "}
					{patient.height ? `${patient.height} cm` : "-"}
				</p>
				<p>
					<span className="font-semibold text-slate-700">
						Weight:
					</span>{" "}
					{patient.weight ? `${patient.weight} kg` : "-"}
				</p>
				<p>
					<span className="font-semibold text-slate-700">
						Blood group:
					</span>{" "}
					{patient.blood_group || "-"}
				</p>
			</div>
		</div>
	);
}
