import { ClinicalRecords } from "../../types";

interface AllergiesCardProps {
	records: ClinicalRecords;
}

export default function AllergiesCard({ records }: AllergiesCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="text-lg font-bold text-slate-800">Allergies</h2>
			<p className="mt-1 text-sm text-slate-500">
				Known patient allergies or sensitivities.
			</p>
			<div className="mt-4 space-y-3">
				{records.allergies.length > 0 ? (
					records.allergies.map((allergy, index) => (
						<div
							key={`${allergy}-${index}`}
							className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
						>
							{allergy}
						</div>
					))
				) : (
					<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
						No allergies recorded.
					</div>
				)}
			</div>
		</div>
	);
}
