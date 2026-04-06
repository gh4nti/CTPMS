import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormState } from "../../../PatientForm";
import {
	deletePatientById,
	fetchPatientById,
	fetchPatientRecordsById,
	ApiError,
	updatePatientById,
} from "../api";
import {
	ClinicalRecords,
	emptyClinicalRecords,
	Patient,
	PatientUpdatePayload,
} from "../types";
import { readArchivedPatientIds, writeArchivedPatientIds } from "../archive";

interface UsePatientProfileResult {
	patient: Patient | null;
	records: ClinicalRecords;
	error: string;
	recordsError: string;
	isLoading: boolean;
	updateMessage: string;
	updateError: string;
	isArchived: boolean;
	isDeleting: boolean;
	canUseClinicalActions: boolean;
	handleFormSubmit: (data: FormState) => Promise<void>;
	handleCancel: () => void;
	handleToggleArchive: () => void;
	handleScheduleAppointment: () => void;
	handleDeletePatient: () => Promise<void>;
	goToEdit: () => void;
}

export default function usePatientProfile(
	patientId: string | undefined,
): UsePatientProfileResult {
	const navigate = useNavigate();
	const [patient, setPatient] = useState<Patient | null>(null);
	const [records, setRecords] =
		useState<ClinicalRecords>(emptyClinicalRecords);
	const [error, setError] = useState("");
	const [recordsError, setRecordsError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [updateMessage, setUpdateMessage] = useState("");
	const [updateError, setUpdateError] = useState("");
	const [isArchived, setIsArchived] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	async function loadPatientProfile() {
		setIsLoading(true);
		setError("");
		setRecordsError("");

		try {
			if (!patientId) {
				setError("Patient not found.");
				setPatient(null);
				setRecords(emptyClinicalRecords);
				return;
			}

			const data = await fetchPatientById(patientId);
			setPatient(data);

			try {
				const recordData = await fetchPatientRecordsById(patientId);
				setRecords(recordData);
			} catch (recordsErr) {
				setRecords(emptyClinicalRecords);
				if (
					recordsErr instanceof ApiError &&
					recordsErr.status === 404
				) {
					setRecordsError(
						"Clinical records were not found for this patient.",
					);
				} else {
					setRecordsError("Could not load clinical records.");
				}
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				setError("Patient not found.");
			} else {
				setError("Could not load patient profile.");
			}
			setPatient(null);
			setRecords(emptyClinicalRecords);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (!patientId) {
			setError("Patient not found.");
			setIsLoading(false);
			return;
		}

		setIsArchived(readArchivedPatientIds().includes(Number(patientId)));
		void loadPatientProfile();
	}, [patientId]);

	function goToEdit() {
		if (!patientId) {
			return;
		}

		navigate(`/patients/${patientId}/edit`);
	}

	function handleCancel() {
		navigate(`/patients/${patientId}`);
		setUpdateMessage("");
		setUpdateError("");
	}

	function handleToggleArchive() {
		if (!patientId) {
			return;
		}

		const numericPatientId = Number(patientId);
		if (!Number.isInteger(numericPatientId) || numericPatientId <= 0) {
			return;
		}

		const archivedPatientIds = readArchivedPatientIds();
		const nextArchivedIds = archivedPatientIds.includes(numericPatientId)
			? archivedPatientIds.filter((value) => value !== numericPatientId)
			: [...archivedPatientIds, numericPatientId];

		writeArchivedPatientIds(nextArchivedIds);
		setIsArchived(nextArchivedIds.includes(numericPatientId));
	}

	function handleScheduleAppointment() {
		if (!patient) {
			return;
		}

		navigate(`/appointments?patientId=${patient.id}`);
	}

	async function handleDeletePatient() {
		if (!patient || !patientId) {
			return;
		}

		const confirmed = window.confirm(
			`Delete patient ${patient.full_name}? This will remove the patient and related records.`,
		);

		if (!confirmed) {
			return;
		}

		setIsDeleting(true);
		setUpdateError("");

		try {
			await deletePatientById(patientId);

			const archivedPatientIds = readArchivedPatientIds().filter(
				(value) => value !== Number(patientId),
			);
			writeArchivedPatientIds(archivedPatientIds);
			navigate("/all-patients");
		} catch (err) {
			if (err instanceof ApiError && err.details) {
				setUpdateError(`${err.message} (${err.details})`);
			} else {
				setUpdateError(
					err instanceof Error
						? err.message
						: "An error occurred while deleting the patient",
				);
			}
		} finally {
			setIsDeleting(false);
		}
	}

	async function handleFormSubmit(data: FormState) {
		setUpdateError("");
		setUpdateMessage("Updating patient...");

		try {
			const payload: PatientUpdatePayload = {
				fullName: data.fullName.trim(),
				dob: data.dob.trim(),
				gender: data.gender.trim(),
				phone: data.phone.trim(),
				email: data.email.trim(),
				heightCm: data.heightCm.trim(),
				weightKg: data.weightKg.trim(),
				bloodGroup: data.bloodGroup.trim(),
				enrollmentStatus: data.enrollmentStatus.trim(),
			};

			if (!patientId) {
				throw new Error("Patient not found.");
			}

			await updatePatientById(patientId, payload);

			setUpdateMessage("Patient updated successfully!");
			await loadPatientProfile();
			navigate(`/patients/${patientId}`);
		} catch (err) {
			setUpdateError(
				err instanceof Error
					? err.message
					: "An error occurred while updating",
			);
			throw err;
		}
	}

	return {
		patient,
		records,
		error,
		recordsError,
		isLoading,
		updateMessage,
		updateError,
		isArchived,
		isDeleting,
		canUseClinicalActions: Boolean(patient),
		handleFormSubmit,
		handleCancel,
		handleToggleArchive,
		handleScheduleAppointment,
		handleDeletePatient,
		goToEdit,
	};
}
