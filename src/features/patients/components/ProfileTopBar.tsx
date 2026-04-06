import { Link } from "react-router-dom";
import { Patient } from "../types";
import { prettyStatus, statusPillClasses } from "../formatters";

interface ProfileTopBarProps {
	patient: Patient | null;
	isEditing: boolean;
	isArchived: boolean;
}

export default function ProfileTopBar({
	patient,
	isEditing,
	isArchived,
}: ProfileTopBarProps) {
	return (
		<div className="mb-6 flex items-center justify-between gap-3">
			<div className="flex items-center gap-2">
				<Link
					to="/"
					className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-700 dark:hover:text-white"
				>
					Home
				</Link>
				<Link
					to="/all-patients"
					className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-700 dark:hover:text-white"
				>
					All Patients
				</Link>
			</div>
			{patient && !isEditing && (
				<div className="flex items-center gap-3">
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
			)}
		</div>
	);
}
