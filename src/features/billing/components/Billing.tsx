import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Invoice } from "../types";
import { InvoiceList } from "./InvoiceList";
import { InvoiceDetailView } from "./InvoiceDetailView";
import { CreateInvoiceModal } from "./CreateInvoiceModal";

interface PatientOption {
	id: number;
	full_name: string;
}

export function Billing() {
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
		null,
	);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [patients, setPatients] = useState<PatientOption[]>([]);
	const [loadingPatients, setLoadingPatients] = useState(true);

	useEffect(() => {
		const fetchPatients = async () => {
			try {
				setLoadingPatients(true);
				const response = await fetch("/api/patients");
				if (response.ok) {
					const data = await response.json();
					setPatients(
						(data || []).map((p: any) => ({
							id: p.id,
							full_name: p.full_name,
						})),
					);
				}
			} catch (err) {
				console.error("Failed to load patients:", err);
			} finally {
				setLoadingPatients(false);
			}
		};

		fetchPatients();
	}, []);

	const handleRefresh = () => {
		setRefreshKey((prev) => prev + 1);
		setSelectedInvoice(null);
	};

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Financial Management
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							Billing & Payments
						</h1>
						<p className="mt-2 text-slate-600">
							Manage invoices, track payments, and generate
							receipts
						</p>
					</div>
					<Link
						to="/"
						className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
					>
						Back to Home
					</Link>
				</div>

				<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-xl font-bold text-slate-800">
							Invoices
						</h2>
						<button
							onClick={() => setShowCreateModal(true)}
							disabled={loadingPatients}
							className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
						>
							+ New Invoice
						</button>
					</div>

					<div key={refreshKey}>
						<InvoiceList onSelectInvoice={setSelectedInvoice} />
					</div>
				</section>

				{selectedInvoice && (
					<InvoiceDetailView
						invoiceId={selectedInvoice.id}
						onClose={() => setSelectedInvoice(null)}
						onInvoiceUpdated={handleRefresh}
					/>
				)}

				{showCreateModal && (
					<CreateInvoiceModal
						patients={patients}
						onClose={() => setShowCreateModal(false)}
						onSuccess={handleRefresh}
					/>
				)}
			</div>
		</main>
	);
}
