export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "completed" | "failed";
export type PaymentMethod =
	| "credit_card"
	| "debit_card"
	| "bank_transfer"
	| "check"
	| "cash";

export interface Invoice {
	id: number;
	patient_id: number;
	patient_name: string;
	invoice_number: string;
	invoice_date: string;
	due_date: string;
	amount: number;
	description: string;
	status: InvoiceStatus;
	paid_amount?: number;
	created_at: string;
	updated_at: string;
}

export interface InvoiceDetail extends Invoice {
	patient_email?: string;
	patient_phone?: string;
	payments: Payment[];
}

export interface Payment {
	id: number;
	invoice_id: number;
	invoice_number?: string;
	patient_id: number;
	patient_name?: string;
	amount: number;
	payment_date: string;
	payment_method: PaymentMethod;
	status: PaymentStatus;
	reference_number?: string;
	notes?: string;
	created_at: string;
}

export interface PaymentDetail extends Payment {
	invoice_date?: string;
	due_date?: string;
	invoice_amount?: number;
	patient_email?: string;
	patient_phone?: string;
}

export interface CreateInvoiceRequest {
	patientId: number;
	amount: number;
	description?: string;
	dueDate: string;
}

export interface CreatePaymentRequest {
	invoiceId: number;
	amount: number;
	paymentMethod?: PaymentMethod;
	referenceNumber?: string;
	notes?: string;
}

export interface UpdateInvoiceStatusRequest {
	status: InvoiceStatus;
}
