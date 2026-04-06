import { Patient } from "../../types";
import {
	prettyGender,
	prettyStatus,
	statusPillClasses,
} from "../../formatters";

interface OverviewCardProps {
	patient: Patient;
	isArchived: boolean;
}

export default function OverviewCard({
	patient,
	isArchived,
}: OverviewCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
						Overview
					</p>
					<h2 className="mt-2 text-lg font-bold text-slate-800">
						Patient summary
					</h2>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClasses(
							patient.enrollment_status,
						)}`}
					>
						{prettyStatus(patient.enrollment_status)}
					</span>
					{isArchived && (
						<span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
							Archived
						</span>
					)}
				</div>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div className="rounded-xl bg-slate-50 p-4">
					<p className="text-xs uppercase tracking-wide text-slate-500">
						Patient ID
					</p>
					<p className="mt-1 text-base font-semibold text-slate-800">
						{patient.id}
					</p>
				</div>
				<div className="rounded-xl bg-slate-50 p-4">
					<p className="text-xs uppercase tracking-wide text-slate-500">
						Age / Gender
					</p>
					<p className="mt-1 text-base font-semibold text-slate-800">
						{patient.age ?? "-"} / {prettyGender(patient.gender)}
					</p>
				</div>
				<div className="rounded-xl bg-slate-50 p-4">
					<p className="text-xs uppercase tracking-wide text-slate-500">
						Disease
					</p>
					<p className="mt-1 text-base font-semibold text-slate-800">
						{patient.disease || "-"}
					</p>
				</div>
				<div className="rounded-xl bg-slate-50 p-4">
					<p className="text-xs uppercase tracking-wide text-slate-500">
						Trial
					</p>
					<p className="mt-1 text-base font-semibold text-slate-800">
						{patient.trial || "-"}
					</p>
				</div>
			</div>
		</div>
	);
}
