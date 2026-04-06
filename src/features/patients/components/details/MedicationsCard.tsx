import { ClinicalRecords } from "../../types";
import { formatMedicationDates } from "../../formatters";

interface MedicationsCardProps {
	records: ClinicalRecords;
}

export default function MedicationsCard({ records }: MedicationsCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="text-lg font-bold text-slate-800">Medications</h2>
			<p className="mt-1 text-sm text-slate-500">
				Current and historical medications.
			</p>
			<div className="mt-4 space-y-3">
				{records.medications.length > 0 ? (
					records.medications.map((medication) => (
						<div
							key={medication.id}
							className="rounded-xl border border-slate-200 bg-slate-50 p-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-semibold text-slate-800">
										{medication.name}
									</p>
									<p className="mt-1 text-sm text-slate-600">
										{medication.class}
									</p>
								</div>
								<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
									{medication.current_status}
								</span>
							</div>
							<p className="mt-3 text-sm text-slate-600">
								{medication.dosage || "No dosage recorded"}
							</p>
							<p className="mt-1 text-xs text-slate-500">
								{formatMedicationDates(
									medication.start_date,
									medication.end_date,
								)}
							</p>
						</div>
					))
				) : (
					<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
						No medications recorded.
					</div>
				)}
			</div>
		</div>
	);
}
