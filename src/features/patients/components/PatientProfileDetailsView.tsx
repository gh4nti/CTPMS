import { Patient, ClinicalRecords } from "../types";
import AlertBanner from "./AlertBanner";
import OverviewCard from "./details/OverviewCard";
import QuickActionsCard from "./details/QuickActionsCard";
import BasicInfoCard from "./details/BasicInfoCard";
import ContactEnrollmentCard from "./details/ContactEnrollmentCard";
import VisitHistoryCard from "./details/VisitHistoryCard";
import MedicationsCard from "./details/MedicationsCard";
import NotesCard from "./details/NotesCard";
import AllergiesCard from "./details/AllergiesCard";

interface PatientProfileDetailsViewProps {
	patient: Patient;
	records: ClinicalRecords;
	isArchived: boolean;
	isDeleting: boolean;
	canUseClinicalActions: boolean;
	updateMessage: string;
	updateError: string;
	recordsError: string;
	onEdit: () => void;
	onToggleArchive: () => void;
	onScheduleAppointment: () => void;
	onDeletePatient: () => void;
}

export default function PatientProfileDetailsView({
	patient,
	records,
	isArchived,
	isDeleting,
	canUseClinicalActions,
	updateMessage,
	updateError,
	recordsError,
	onEdit,
	onToggleArchive,
	onScheduleAppointment,
	onDeletePatient,
}: PatientProfileDetailsViewProps) {
	return (
		<div className="space-y-6">
			{updateMessage && (
				<AlertBanner tone="success" message={updateMessage} />
			)}
			{updateError && <AlertBanner tone="error" message={updateError} />}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
				<OverviewCard patient={patient} isArchived={isArchived} />
				<QuickActionsCard
					isArchived={isArchived}
					isDeleting={isDeleting}
					canUseClinicalActions={canUseClinicalActions}
					onEdit={onEdit}
					onToggleArchive={onToggleArchive}
					onScheduleAppointment={onScheduleAppointment}
					onDeletePatient={onDeletePatient}
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<BasicInfoCard patient={patient} />
				<ContactEnrollmentCard patient={patient} />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<VisitHistoryCard records={records} />
				<MedicationsCard records={records} />
				<NotesCard records={records} />
				<AllergiesCard records={records} />
			</div>

			{recordsError && (
				<AlertBanner tone="warning" message={recordsError} />
			)}
		</div>
	);
}
