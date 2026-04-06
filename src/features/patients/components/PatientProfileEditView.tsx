import PatientForm, { FormState } from "../../../PatientForm";
import { Patient } from "../types";
import AlertBanner from "./AlertBanner";

interface PatientProfileEditViewProps {
	patient: Patient;
	isLoading: boolean;
	updateMessage: string;
	updateError: string;
	onSubmit: (data: FormState) => Promise<void>;
	onCancel: () => void;
}

export default function PatientProfileEditView({
	patient,
	isLoading,
	updateMessage,
	updateError,
	onSubmit,
	onCancel,
}: PatientProfileEditViewProps) {
	return (
		<div className="space-y-6">
			{updateMessage && (
				<AlertBanner tone="success" message={updateMessage} />
			)}
			{updateError && <AlertBanner tone="error" message={updateError} />}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="mb-6 text-lg font-bold text-slate-800">
					Edit Patient Information
				</h2>
				<PatientForm
					mode="edit"
					initialData={{
						fullName: patient.full_name,
						dob: patient.dob,
						gender: patient.gender,
						phone: patient.phone,
						email: patient.email,
						heightCm: String(patient.height || ""),
						weightKg: String(patient.weight || ""),
						bloodGroup: patient.blood_group,
						enrollmentStatus: patient.enrollment_status,
					}}
					onSubmit={onSubmit}
					onCancel={onCancel}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}
