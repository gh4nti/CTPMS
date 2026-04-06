interface QuickActionsCardProps {
	isArchived: boolean;
	isDeleting: boolean;
	canManagePatient: boolean;
	canUseClinicalActions: boolean;
	onEdit: () => void;
	onToggleArchive: () => void;
	onScheduleAppointment: () => void;
	onDeletePatient: () => void;
}

export default function QuickActionsCard({
	isArchived,
	isDeleting,
	canManagePatient,
	canUseClinicalActions,
	onEdit,
	onToggleArchive,
	onScheduleAppointment,
	onDeletePatient,
}: QuickActionsCardProps) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
				Quick Actions
			</p>
			<div className="mt-4 flex flex-wrap gap-3">
				<button
					onClick={onEdit}
					disabled={!canManagePatient}
					className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
				>
					Edit patient
				</button>
				<button
					onClick={onToggleArchive}
					disabled={!canManagePatient}
					className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					{isArchived ? "Unarchive" : "Archive"}
				</button>
				<button
					onClick={onScheduleAppointment}
					disabled={!canUseClinicalActions}
					className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Schedule appointment
				</button>
				<button
					onClick={onDeletePatient}
					disabled={isDeleting || !canManagePatient}
					className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isDeleting ? "Deleting..." : "Delete patient"}
				</button>
			</div>
		</div>
	);
}
