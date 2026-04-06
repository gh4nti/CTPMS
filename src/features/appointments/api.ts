import { Patient } from "../patients/types";
import {
	Appointment,
	AppointmentFormState,
	AppointmentRangeResponse,
} from "./types";
import { fetchWithAuth } from "../../auth";

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
	return new ApiError(
		response.status,
		errorBody.error || "Request failed",
		errorBody.details,
	);
}

export async function fetchPatients(): Promise<Patient[]> {
	const response = await fetchWithAuth("/api/patients");
	if (!response.ok) {
		throw await buildApiError(response);
	}

	return (await response.json()) as Patient[];
}

export async function fetchAppointments(params: {
	from: string;
	to: string;
}): Promise<Appointment[]> {
	const searchParams = new URLSearchParams({
		from: params.from,
		to: params.to,
	});
	const response = await fetchWithAuth(
		`/api/appointments?${searchParams.toString()}`,
	);
	if (!response.ok) {
		throw await buildApiError(response);
	}

	const data = (await response.json()) as AppointmentRangeResponse;
	return data.appointments || [];
}

export async function createAppointment(
	payload: AppointmentFormState,
): Promise<number> {
	const response = await fetchWithAuth("/api/appointments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw await buildApiError(response);
	}

	const data = (await response.json().catch(() => ({}))) as { id?: number };
	return Number(data.id || 0);
}

export async function updateAppointment(
	id: number,
	payload: AppointmentFormState,
): Promise<void> {
	const response = await fetchWithAuth(`/api/appointments/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw await buildApiError(response);
	}
}

export async function cancelAppointment(id: number): Promise<void> {
	const response = await fetchWithAuth(`/api/appointments/${id}/cancel`, {
		method: "PATCH",
	});

	if (!response.ok) {
		throw await buildApiError(response);
	}
}
