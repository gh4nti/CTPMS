interface ProfileHeaderProps {
	patientName?: string;
	patientId?: string;
	onLogout?: () => void;
}

export default function ProfileHeader({
	patientName,
	patientId,
	onLogout,
}: ProfileHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
					Single Patient Profile
				</p>
				<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
					{patientName ? patientName : `Patient #${patientId || "-"}`}
				</h1>
				<p className="mt-2 text-sm text-slate-600">
					Visit history, notes, medications, allergies, and quick
					actions for the selected patient.
				</p>
			</div>
			{onLogout && (
				<button
					onClick={onLogout}
					className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
				>
					Logout
				</button>
			)}
		</div>
	);
}
