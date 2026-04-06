import React, { useState, useEffect } from "react";
import type { Invoice, InvoiceStatus } from "../types";
import { getInvoices } from "../api";

interface InvoiceListProps {
	patientId?: number;
	onSelectInvoice: (invoice: Invoice) => void;
}

const statusColors: Record<InvoiceStatus, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	paid: "bg-green-100 text-green-800",
	overdue: "bg-red-100 text-red-800",
	cancelled: "bg-gray-100 text-gray-800",
};

export function InvoiceList({ patientId, onSelectInvoice }: InvoiceListProps) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
		"all",
	);

	useEffect(() => {
		const fetchInvoices = async () => {
			try {
				setLoading(true);
				const data = await getInvoices(
					patientId,
					statusFilter === "all" ? undefined : statusFilter,
				);
				setInvoices(data);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load invoices",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchInvoices();
	}, [patientId, statusFilter]);

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: "INR",
		}).format(amount);
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="flex gap-2 flex-wrap">
					{(["all", "pending", "paid", "overdue"] as const).map(
						(status) => (
							<button
								key={status}
								onClick={() => setStatusFilter(status)}
								className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
									statusFilter === status
										? "bg-teal-600 text-white"
										: "bg-slate-700 text-white hover:bg-slate-600"
								}`}
								disabled
							>
								{status.charAt(0).toUpperCase() +
									status.slice(1)}
							</button>
						),
					)}
				</div>
				<div className="p-4 text-center text-gray-400">
					Loading invoices...
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-4">
				<div className="flex gap-2 flex-wrap">
					{(["all", "pending", "paid", "overdue"] as const).map(
						(status) => (
							<button
								key={status}
								onClick={() => setStatusFilter(status)}
								className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
									statusFilter === status
										? "bg-teal-600 text-white"
										: "bg-slate-700 text-white hover:bg-slate-600"
								}`}
							>
								{status.charAt(0).toUpperCase() +
									status.slice(1)}
							</button>
						),
					)}
				</div>
				<div className="p-4 text-red-500">Error: {error}</div>
			</div>
		);
	}

	if (invoices.length === 0) {
		return (
			<div className="space-y-4 bg-white">
				<div className="flex gap-2 flex-wrap">
					{(["all", "pending", "paid", "overdue"] as const).map(
						(status) => (
							<button
								key={status}
								onClick={() => setStatusFilter(status)}
								className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
									statusFilter === status
										? "bg-teal-600 text-white"
										: "bg-slate-700 text-white hover:bg-slate-600"
								}`}
							>
								{status.charAt(0).toUpperCase() +
									status.slice(1)}
							</button>
						),
					)}
				</div>
				<div className="p-4 text-center text-gray-400">
					No invoices found
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 bg-white">
			<div className="flex gap-2 flex-wrap">
				{(["all", "pending", "paid", "overdue"] as const).map(
					(status) => (
						<button
							key={status}
							onClick={() => setStatusFilter(status)}
							className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
								statusFilter === status
									? "bg-teal-600 text-white"
									: "bg-slate-700 text-white hover:bg-slate-600"
							}`}
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</button>
					),
				)}
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 border-b border-gray-200">
						<tr>
							<th className="px-4 py-2 text-left font-semibold">
								Invoice #
							</th>
							{!patientId && (
								<th className="px-4 py-2 text-left font-semibold">
									Patient
								</th>
							)}
							<th className="px-4 py-2 text-left font-semibold">
								Date
							</th>
							<th className="px-4 py-2 text-left font-semibold">
								Amount
							</th>
							<th className="px-4 py-2 text-left font-semibold">
								Status
							</th>
							<th className="px-4 py-2 text-left font-semibold">
								Paid
							</th>
							<th className="px-4 py-2 text-center font-semibold">
								Action
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{invoices.map((invoice) => (
							<tr
								key={invoice.id}
								className="hover:shadow-md transition-shadow cursor-pointer"
							>
								<td className="px-4 py-3 font-monospace font-semibold">
									{invoice.invoice_number}
								</td>
								{!patientId && (
									<td className="px-4 py-3">
										{invoice.patient_name}
									</td>
								)}
								<td className="px-4 py-3">
									{formatDate(invoice.invoice_date)}
								</td>
								<td className="px-4 py-3">
									{formatCurrency(invoice.amount)}
								</td>
								<td className="px-4 py-3">
									<span
										className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[invoice.status]}`}
									>
										{invoice.status
											.charAt(0)
											.toUpperCase() +
											invoice.status.slice(1)}
									</span>
								</td>
								<td className="px-4 py-3">
									{invoice.paid_amount
										? formatCurrency(invoice.paid_amount)
										: "₹0.00"}
								</td>
								<td className="px-4 py-3 text-center">
									<button
										onClick={() => onSelectInvoice(invoice)}
										className="text-blue-600 hover:text-blue-800 font-medium"
									>
										View
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
