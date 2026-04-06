import { ClinicalRecords } from "../../types";
import { formatDisplayDate } from "../../formatters";

interface NotesCardProps {
	records: ClinicalRecords;
}

export default function NotesCard({ records }: NotesCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h2 className="text-lg font-bold text-slate-800">Notes</h2>
			<p className="mt-1 text-sm text-slate-500">
				Clinical notes captured for the patient.
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
								{formatDisplayDate(note.date)}
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
	);
}
