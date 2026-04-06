export type AppointmentStatus = "scheduled" | "cancelled";

export interface Appointment {
	id: number;
	patient_id: number;
	patient_name: string;
	title: string;
	start_time: string;
	end_time: string;
	location: string;
	notes: string;
	status: AppointmentStatus;
	created_at: string;
	updated_at: string;
}

export interface AppointmentRangeResponse {
	appointments: Appointment[];
}

export interface AppointmentFormState {
	patientId: string;
	title: string;
	startTime: string;
	endTime: string;
	location: string;
	notes: string;
}
