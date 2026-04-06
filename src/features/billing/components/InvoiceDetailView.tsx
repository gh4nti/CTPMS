import React, { useState, useEffect } from "react";
import type { InvoiceDetail, PaymentMethod } from "../types";
import { getInvoiceDetail, createPayment, updateInvoiceStatus } from "../api";

interface InvoiceDetailProps {
	invoiceId: number;
	onClose: () => void;
	onInvoiceUpdated: () => void;
}

export function InvoiceDetailView({
	invoiceId,
	onClose,
	onInvoiceUpdated,
}: InvoiceDetailProps) {
	const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [recordingPayment, setRecordingPayment] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState("");
	const [paymentMethod, setPaymentMethod] =
		useState<PaymentMethod>("credit_card");
	const [paymentRef, setPaymentRef] = useState("");
	const [paymentNotes, setPaymentNotes] = useState("");

	useEffect(() => {
		const fetchInvoice = async () => {
			try {
				setLoading(true);
				const data = await getInvoiceDetail(invoiceId);
				setInvoice(data);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load invoice details",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchInvoice();
	}, [invoiceId]);

	const handleRecordPayment = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!invoice || !paymentAmount) {
			setError("Payment amount is required");
			return;
		}

		const amount = Number(paymentAmount);
		if (isNaN(amount) || amount <= 0) {
			setError("Invalid payment amount");
			return;
		}

		try {
			setRecordingPayment(true);
			setError(null);

			await createPayment({
				invoiceId: invoice.id,
				amount,
				paymentMethod,
				referenceNumber: paymentRef || undefined,
				notes: paymentNotes || undefined,
			});

			setPaymentAmount("");
			setPaymentRef("");
			setPaymentNotes("");

			// Refresh invoice data
			const updated = await getInvoiceDetail(invoiceId);
			setInvoice(updated);
			onInvoiceUpdated();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to record payment",
			);
		} finally {
			setRecordingPayment(false);
		}
	};

	const downloadReceipt = () => {
		if (!invoice) return;

		const receiptContent = `
PAYMENT RECEIPT
=====================================

Invoice Number: ${invoice.invoice_number}
Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
Patient Name: ${invoice.patient_name}
Patient Email: ${invoice.patient_email || "N/A"}
Patient Phone: ${invoice.patient_phone || "N/A"}

=====================================
Description: ${invoice.description}
Invoice Amount: ₹${invoice.amount.toFixed(2)}
Paid Amount: ₹${(invoice.paid_amount || 0).toFixed(2)}
Remaining: ₹${(invoice.amount - (invoice.paid_amount || 0)).toFixed(2)}
Status: ${invoice.status.toUpperCase()}

=====================================
PAYMENT HISTORY
=====================================`;

		invoice.payments.forEach((payment) => {
			receiptContent += `
Payment #${payment.id}
Date: ${new Date(payment.payment_date).toLocaleDateString()}
Amount: ₹${payment.amount.toFixed(2)}
Method: ${payment.payment_method}
Status: ${payment.status}
${payment.reference_number ? `Reference: ${payment.reference_number}` : ""}`;
		});

		receiptContent += `

=====================================
Generated: ${new Date().toLocaleString()}
`;

		const element = document.createElement("a");
		element.setAttribute(
			"href",
			"data:text/plain;charset=utf-8," +
				encodeURIComponent(receiptContent),
		);
		element.setAttribute(
			"download",
			`receipt-${invoice.invoice_number}.txt`,
		);
		element.style.display = "none";
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	const printReceipt = () => {
		if (!invoice) return;

		const printWindow = window.open("", "", "width=800,height=600");
		if (!printWindow) return;

		const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
	<title>Receipt - ${invoice.invoice_number}</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; }
		.receipt { max-width: 600px; margin: 0 auto; }
		h1 { text-align: center; margin-bottom: 30px; }
		.section { margin: 20px 0; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
		.row { display: flex; justify-content: space-between; margin: 8px 0; }
		.label { font-weight: bold; }
		table { width: 100%; margin-top: 10px; border-collapse: collapse; }
		td { padding: 8px; border: 1px solid #ddd; }
		th { background-color: #f0f0f0; padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold; }
		.total { font-weight: bold; font-size: 18px; }
		.footer { text-align: center; margin-top: 30px; color: #666; }
	</style>
</head>
<body>
	<div class="receipt">
		<h1>PAYMENT RECEIPT</h1>
		
		<div class="section">
			<div class="row"><span class="label">Invoice #:</span> <span>${invoice.invoice_number}</span></div>
			<div class="row"><span class="label">Invoice Date:</span> <span>${new Date(invoice.invoice_date).toLocaleDateString()}</span></div>
			<div class="row"><span class="label">Due Date:</span> <span>${new Date(invoice.due_date).toLocaleDateString()}</span></div>
			<div class="row"><span class="label">Patient:</span> <span>${invoice.patient_name}</span></div>
			<div class="row"><span class="label">Email:</span> <span>${invoice.patient_email || "N/A"}</span></div>
			<div class="row"><span class="label">Phone:</span> <span>${invoice.patient_phone || "N/A"}</span></div>
		</div>

		<div class="section">
			<div class="row"><span class="label">Description:</span> <span>${invoice.description}</span></div>
		</div>

		<div class="section">
			<table>
				<thead>
					<tr>
						<th>Item</th>
						<th style="text-align: right;">Amount</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Clinical Treatment Services</td>
						<td style="text-align: right;">₹${invoice.amount.toFixed(2)}</td>
					</tr>
					<tr class="total">
						<td>Invoice Total</td>
						<td style="text-align: right;">₹${invoice.amount.toFixed(2)}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="section">
			<div class="row"><span class="label">Amount Paid:</span> <span>₹${(invoice.paid_amount || 0).toFixed(2)}</span></div>
			<div class="row"><span class="label">Remaining Balance:</span> <span>₹${(invoice.amount - (invoice.paid_amount || 0)).toFixed(2)}</span></div>
			<div class="row"><span class="label">Status:</span> <span>${invoice.status.toUpperCase()}</span></div>
		</div>

		${
			invoice.payments.length > 0
				? `
		<div class="section">
			<h3>Payment History</h3>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Amount</th>
						<th>Method</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					${invoice.payments
						.map(
							(p) => `
					<tr>
						<td>${new Date(p.payment_date).toLocaleDateString()}</td>
						<td>₹${p.amount.toFixed(2)}</td>
						<td>${p.payment_method}</td>
						<td>${p.status}</td>
					</tr>
					`,
						)
						.join("")}
				</tbody>
			</table>
		</div>
		`
				: ""
		}

		<div class="footer">
			<p>Thank you for your payment!</p>
			<p>Generated: ${new Date().toLocaleString()}</p>
		</div>
	</div>
	<script>window.print();</script>
</body>
</html>`;

		printWindow.document.write(receiptHTML);
		printWindow.document.close();
	};

	if (loading) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
				<div className="bg-white rounded-lg p-6">Loading...</div>
			</div>
		);
	}

	if (!invoice) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
				<div className="bg-white rounded-lg p-6">
					<p>Invoice not found</p>
					<button
						onClick={onClose}
						className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
					>
						Close
					</button>
				</div>
			</div>
		);
	}

	const remainingBalance = invoice.amount - (invoice.paid_amount || 0);
	const isPaid = remainingBalance < 0.01;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
			<div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-2xl font-bold">
						Invoice {invoice.invoice_number}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl"
					>
						×
					</button>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
						{error}
					</div>
				)}

				<div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
					<div>
						<p className="text-sm text-gray-600">Patient</p>
						<p className="font-semibold">{invoice.patient_name}</p>
						<p className="text-sm text-gray-600">
							{invoice.patient_email}
						</p>
						<p className="text-sm text-gray-600">
							{invoice.patient_phone}
						</p>
					</div>
					<div>
						<p className="text-sm text-gray-600">Invoice Date</p>
						<p className="font-semibold">
							{new Date(
								invoice.invoice_date,
							).toLocaleDateString()}
						</p>
						<p className="text-sm text-gray-600 mt-2">Due Date</p>
						<p className="font-semibold">
							{new Date(invoice.due_date).toLocaleDateString()}
						</p>
					</div>
				</div>

				<div className="mb-6 p-4 border rounded">
					<p className="text-sm text-gray-600">Description</p>
					<p className="font-semibold">{invoice.description}</p>
				</div>

				<div className="grid grid-cols-4 gap-4 mb-6">
					<div className="p-4 bg-blue-700 rounded">
						<p className="text-sm text-blue-100">Invoice Amount</p>
						<p className="text-xl font-bold text-white">
							₹{invoice.amount.toFixed(2)}
						</p>
					</div>
					<div className="p-4 bg-green-700 rounded">
						<p className="text-sm text-green-100">Paid</p>
						<p className="text-xl font-bold text-white">
							₹{(invoice.paid_amount || 0).toFixed(2)}
						</p>
					</div>
					<div
						className={`p-4 rounded ${isPaid ? "bg-green-700" : "bg-orange-700"}`}
					>
						<p
							className={`text-sm ${isPaid ? "text-green-100" : "text-orange-100"}`}
						>
							Remaining
						</p>
						<p className="text-xl font-bold text-white">
							₹{remainingBalance.toFixed(2)}
						</p>
					</div>
					<div className="p-4 bg-slate-700 rounded">
						<p className="text-sm text-slate-200">Status</p>
						<p className="text-xl font-bold text-white capitalize">
							{invoice.status}
						</p>
					</div>
				</div>

				{invoice.payments.length > 0 && (
					<div className="mb-6">
						<h3 className="font-semibold mb-3">Payment History</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-slate-50 border-b border-gray-200">
									<tr>
										<th className="px-3 py-2 text-left">
											Date
										</th>
										<th className="px-3 py-2 text-left">
											Amount
										</th>
										<th className="px-3 py-2 text-left">
											Method
										</th>
										<th className="px-3 py-2 text-left">
											Reference
										</th>
										<th className="px-3 py-2 text-left">
											Status
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{invoice.payments.map((payment) => (
										<tr
											key={payment.id}
											className="hover:bg-gray-50"
										>
											<td className="px-3 py-2">
												{new Date(
													payment.payment_date,
												).toLocaleDateString()}
											</td>
											<td className="px-3 py-2">
												₹{payment.amount.toFixed(2)}
											</td>
											<td className="px-3 py-2">
												{payment.payment_method}
											</td>
											<td className="px-3 py-2 text-gray-600">
												{payment.reference_number ||
													"-"}
											</td>
											<td className="px-3 py-2">
												<span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
													{payment.status}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{!isPaid && (
					<form
						onSubmit={handleRecordPayment}
						className="mb-6 p-4 bg-blue-50 rounded"
					>
						<h3 className="font-semibold mb-4">Record Payment</h3>
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<label className="block text-sm font-medium mb-1">
									Amount (₹)
								</label>
								<input
									type="number"
									step="0.01"
									value={paymentAmount}
									onChange={(e) =>
										setPaymentAmount(e.target.value)
									}
									placeholder="0.00"
									className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								/>
								<p className="text-xs text-gray-600 mt-1">
									Remaining: ₹{remainingBalance.toFixed(2)}
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">
									Payment Method
								</label>
								<select
									value={paymentMethod}
									onChange={(e) =>
										setPaymentMethod(
											e.target.value as PaymentMethod,
										)
									}
									className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="credit_card">
										Credit Card
									</option>
									<option value="debit_card">
										Debit Card
									</option>
									<option value="bank_transfer">
										Bank Transfer
									</option>
									<option value="check">Check</option>
									<option value="cash">Cash</option>
								</select>
							</div>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1">
								Reference Number (Optional)
							</label>
							<input
								type="text"
								value={paymentRef}
								onChange={(e) => setPaymentRef(e.target.value)}
								placeholder="e.g., Transaction ID or Check #"
								className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1">
								Notes (Optional)
							</label>
							<textarea
								value={paymentNotes}
								onChange={(e) =>
									setPaymentNotes(e.target.value)
								}
								placeholder="Additional notes..."
								className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								rows={2}
							/>
						</div>
						<button
							type="submit"
							disabled={recordingPayment}
							className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
						>
							{recordingPayment
								? "Recording..."
								: "Record Payment"}
						</button>
					</form>
				)}

				<div className="flex gap-2 justify-end">
					<button
						onClick={downloadReceipt}
						className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
					>
						Download Receipt
					</button>
					<button
						onClick={printReceipt}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
					>
						Print Receipt
					</button>
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-semibold"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
