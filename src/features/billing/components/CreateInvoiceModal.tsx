import React, { useState, useEffect } from "react";
import { createInvoice } from "../api";

interface CreateInvoiceModalProps {
	patientId?: number;
	patients?: Array<{ id: number; full_name: string }>;
	canManageBilling: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function CreateInvoiceModal({
	patientId,
	patients = [],
	canManageBilling,
	onClose,
	onSuccess,
}: CreateInvoiceModalProps) {
	const [selectedPatientId, setSelectedPatientId] = useState(
		patientId ? String(patientId) : "",
	);
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState(
		"Clinical Treatment Services",
	);
	const [dueDate, setDueDate] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Set default due date to 30 days from now
		const today = new Date();
		const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
		const yyyy = futureDate.getFullYear();
		const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
		const dd = String(futureDate.getDate()).padStart(2, "0");
		setDueDate(`${yyyy}-${mm}-${dd}`);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!selectedPatientId || !amount || !dueDate) {
			setError("All fields are required");
			return;
		}

		if (!canManageBilling) {
			setError("You do not have permission to create invoices.");
			return;
		}

		const numAmount = Number(amount);
		if (isNaN(numAmount) || numAmount <= 0) {
			setError("Amount must be a valid positive number");
			return;
		}

		try {
			setLoading(true);
			await createInvoice({
				patientId: Number(selectedPatientId),
				amount: numAmount,
				description: description || "Clinical Treatment Services",
				dueDate: new Date(dueDate).toISOString(),
			});

			onSuccess();
			onClose();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create invoice",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950/95 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur">
				<h2 className="mb-6 text-2xl font-bold text-slate-100">
					Create Invoice
				</h2>

				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="mb-2 block text-sm font-medium text-slate-300">
							Patient
						</label>
						<select
							value={selectedPatientId}
							onChange={(e) =>
								setSelectedPatientId(e.target.value)
							}
							disabled={!!patientId}
							className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-800"
							required
						>
							<option value="">Select a patient...</option>
							{patients.map((p) => (
								<option key={p.id} value={p.id}>
									{p.full_name}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-slate-300">
							Amount (₹)
						</label>
						<input
							type="number"
							step="0.01"
							min="0"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
							required
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-slate-300">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Service description..."
							className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
							rows={3}
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-slate-300">
							Due Date
						</label>
						<input
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
							required
						/>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							type="submit"
							disabled={loading}
							className="flex-1 rounded bg-teal-600 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
						>
							{loading ? "Creating..." : "Create Invoice"}
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 rounded bg-slate-500 py-2 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
