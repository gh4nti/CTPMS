import type {
	Invoice,
	InvoiceDetail,
	Payment,
	PaymentDetail,
	CreateInvoiceRequest,
	CreatePaymentRequest,
	UpdateInvoiceStatusRequest,
} from "./types";

const API_BASE = "/api";

export async function getInvoices(
	patientId?: number,
	status?: string,
): Promise<Invoice[]> {
	const params = new URLSearchParams();
	if (patientId) params.append("patientId", String(patientId));
	if (status) params.append("status", status);

	const response = await fetch(`${API_BASE}/invoices?${params.toString()}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch invoices: ${response.statusText}`);
	}

	const data = await response.json();
	return data.invoices || [];
}

export async function getInvoiceDetail(
	invoiceId: number,
): Promise<InvoiceDetail> {
	const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch invoice: ${response.statusText}`);
	}

	return response.json();
}

export async function createInvoice(
	data: CreateInvoiceRequest,
): Promise<{ id: number; invoice_number: string }> {
	const response = await fetch(`${API_BASE}/invoices`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create invoice");
	}

	return response.json();
}

export async function updateInvoiceStatus(
	invoiceId: number,
	data: UpdateInvoiceStatusRequest,
): Promise<{ id: number; status: string }> {
	const response = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update invoice status");
	}

	return response.json();
}

export async function getPayments(
	invoiceId?: number,
	patientId?: number,
	status?: string,
): Promise<Payment[]> {
	const params = new URLSearchParams();
	if (invoiceId) params.append("invoiceId", String(invoiceId));
	if (patientId) params.append("patientId", String(patientId));
	if (status) params.append("status", status);

	const response = await fetch(`${API_BASE}/payments?${params.toString()}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch payments: ${response.statusText}`);
	}

	const data = await response.json();
	return data.payments || [];
}

export async function getPaymentDetail(
	paymentId: number,
): Promise<PaymentDetail> {
	const response = await fetch(`${API_BASE}/payments/${paymentId}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch payment: ${response.statusText}`);
	}

	return response.json();
}

export async function createPayment(
	data: CreatePaymentRequest,
): Promise<{ id: number; fully_paid: boolean }> {
	const response = await fetch(`${API_BASE}/payments`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to record payment");
	}

	return response.json();
}
