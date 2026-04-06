import { ClinicalRecords } from "../../types";
import { formatDisplayDate } from "../../formatters";

interface VisitHistoryCardProps {
	records: ClinicalRecords;
}

export default function VisitHistoryCard({ records }: VisitHistoryCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="text-lg font-bold text-slate-800">Visit history</h2>
			<p className="mt-1 text-sm text-slate-500">
				Recent clinical activity captured from lab results.
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
										{visit.title}
									</p>
									<p className="mt-1 text-sm text-slate-600">
										{formatDisplayDate(visit.date)}
									</p>
								</div>
								<div className="text-right text-sm text-slate-600">
									<p className="font-semibold text-slate-800">
										{visit.value} {visit.unit}
									</p>
									<p>{visit.interpretation}</p>
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
	);
}
