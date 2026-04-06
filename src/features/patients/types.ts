export type EnrollmentStatus =
	| "screening"
	| "eligible"
	| "enrolled"
	| "hold"
	| "not-eligible";

export interface Patient {
	id: number;
	full_name: string;
	dob: string;
	age: number | null;
	gender: string;
	phone: string;
	email: string;
	height: number | null;
	weight: number | null;
	blood_group: string;
	disease: string;
	trial: string;
	enrollment_status: EnrollmentStatus;
	created_at: string;
}

export interface ClinicalVisit {
	id: number;
	title: string;
	date: string;
	value: number;
	unit: string;
	interpretation: string;
}

export interface ClinicalMedication {
	id: number;
	name: string;
	class: string;
	dosage: string;
	start_date: string;
	end_date: string | null;
	current_status: string;
}

export interface ClinicalRecordNote {
	id: string;
	title: string;
	body: string;
	date: string;
}

export interface ClinicalRecords {
	medications: ClinicalMedication[];
	visits: ClinicalVisit[];
	notes: ClinicalRecordNote[];
	allergies: string[];
}

export interface PatientUpdatePayload {
	fullName: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	heightCm: string;
	weightKg: string;
	bloodGroup: string;
	enrollmentStatus: string;
}

export const emptyClinicalRecords: ClinicalRecords = {
	medications: [],
	visits: [],
	notes: [],
	allergies: [],
};
