import {
	ClinicalRecords,
	emptyClinicalRecords,
	Patient,
	PatientUpdatePayload,
} from "./types";

interface ApiErrorBody {
	error?: string;
	details?: string;
}

export class ApiError extends Error {
	status: number;
	details?: string;

	constructor(status: number, message: string, details?: string) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

async function buildApiError(response: Response): Promise<ApiError> {
	const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody;
	const message = errorBody.error || "Request failed";
	return new ApiError(response.status, message, errorBody.details);
}

export async function fetchPatientById(id: string): Promise<Patient> {
	const response = await fetch(`/api/patients/${id}`);
	if (!response.ok) {
		throw await buildApiError(response);
	}

	return (await response.json()) as Patient;
}

export async function fetchPatientRecordsById(
	id: string,
): Promise<ClinicalRecords> {
	const response = await fetch(`/api/patients/${id}/records`);
	if (!response.ok) {
		throw await buildApiError(response);
	}

	const recordData = (await response.json()) as ClinicalRecords;
	return {
		medications: recordData.medications || emptyClinicalRecords.medications,
		visits: recordData.visits || emptyClinicalRecords.visits,
		notes: recordData.notes || emptyClinicalRecords.notes,
		allergies: recordData.allergies || emptyClinicalRecords.allergies,
	};
}

export async function updatePatientById(
	id: string,
	payload: PatientUpdatePayload,
): Promise<void> {
	const response = await fetch(`/api/patients/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw await buildApiError(response);
	}
}

export async function deletePatientById(id: string): Promise<void> {
	const response = await fetch(`/api/patients/${id}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw await buildApiError(response);
	}
}
