import { useLocation, useParams } from "react-router-dom";
import ProfileHeader from "./features/patients/components/ProfileHeader";
import ProfileTopBar from "./features/patients/components/ProfileTopBar";
import PatientProfileEditView from "./features/patients/components/PatientProfileEditView";
import PatientProfileDetailsView from "./features/patients/components/PatientProfileDetailsView";
import AlertBanner from "./features/patients/components/AlertBanner";
import usePatientProfile from "./features/patients/hooks/usePatientProfile";
import { AuthUser, hasPermission } from "./auth";

interface PatientProfileProps {
	onLogout?: () => void;
	currentUser: AuthUser | null;
}

export default function PatientProfile({
	onLogout,
	currentUser,
}: PatientProfileProps) {
	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const isEditing = location.pathname.endsWith("/edit");
	const canManagePatient = Boolean(
		currentUser && hasPermission(currentUser.role, "patients:edit"),
	);
	const {
		patient,
		records,
		error,
		recordsError,
		isLoading,
		updateMessage,
		updateError,
		isArchived,
		isDeleting,
		canUseClinicalActions,
		handleFormSubmit,
		handleCancel,
		handleToggleArchive,
		handleScheduleAppointment,
		handleDeletePatient,
		goToEdit,
	} = usePatientProfile(id, canManagePatient);

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<ProfileHeader
					patientName={patient?.full_name}
					patientId={id}
					onLogout={onLogout}
				/>

				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<ProfileTopBar
						patient={patient}
						isEditing={isEditing}
						isArchived={isArchived}
					/>

					{isLoading ? (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
							Loading patient profile...
						</div>
					) : error ? (
						<AlertBanner tone="error" message={error} />
					) : patient ? (
						isEditing ? (
							<PatientProfileEditView
								patient={patient}
								isLoading={isLoading}
								updateMessage={updateMessage}
								updateError={updateError}
								onSubmit={handleFormSubmit}
								onCancel={handleCancel}
							/>
						) : (
							<PatientProfileDetailsView
								patient={patient}
								records={records}
								isArchived={isArchived}
								isDeleting={isDeleting}
								canManagePatient={canManagePatient}
								canUseClinicalActions={canUseClinicalActions}
								updateMessage={updateMessage}
								updateError={updateError}
								recordsError={recordsError}
								onEdit={goToEdit}
								onToggleArchive={handleToggleArchive}
								onScheduleAppointment={
									handleScheduleAppointment
								}
								onDeletePatient={() => {
									void handleDeletePatient();
								}}
							/>
						)
					) : null}
				</section>
			</div>
		</main>
	);
}
