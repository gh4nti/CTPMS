import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthUser, fetchWithAuth } from "./auth";

interface MonthlyPatientsPoint {
	month: string;
	count: number;
}

interface AppointmentCompletion {
	completed: number;
	cancelled: number;
	total: number;
	rate: number;
}

interface RevenueSummary {
	total_invoiced: number;
	total_collected: number;
	outstanding: number;
	invoice_count: number;
	payment_count: number;
}

interface TopService {
	service: string;
	invoice_count: number;
	revenue: number;
}

interface ReportsResponse {
	new_patients_per_month: MonthlyPatientsPoint[];
	appointment_completion_rate: AppointmentCompletion;
	revenue_summary: RevenueSummary;
	top_services: TopService[];
}

interface ReportsDashboardProps {
	currentUser: AuthUser | null;
	onLogout?: () => void;
}

function formatMonthLabel(monthValue: string): string {
	const parsed = new Date(`${monthValue}-01T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return monthValue;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
	}).format(parsed);
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 2,
	}).format(value);
}

export default function ReportsDashboard({
	currentUser,
	onLogout,
}: ReportsDashboardProps) {
	const [data, setData] = useState<ReportsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;

		async function loadReports() {
			try {
				setIsLoading(true);
				setError("");
				const response = await fetchWithAuth(
					"/api/reports/dashboard?months=12",
					{},
					currentUser,
				);

				if (!response.ok) {
					throw new Error(`Request failed (${response.status})`);
				}

				const payload = (await response.json()) as ReportsResponse;
				if (isMounted) {
					setData(payload);
				}
			} catch (err) {
				if (isMounted) {
					setError(
						`Could not load reports: ${err instanceof Error ? err.message : "Unknown error"}`,
					);
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		}

		void loadReports();

		return () => {
			isMounted = false;
		};
	}, [currentUser]);

	const maxMonthlyCount = useMemo(() => {
		if (!data?.new_patients_per_month.length) {
			return 1;
		}

		return Math.max(
			1,
			...data.new_patients_per_month.map((point) => point.count),
		);
	}, [data]);

	return (
		<main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Analytics
						</p>
						<h1 className="mt-3 text-3xl font-bold text-slate-800 sm:text-4xl">
							Reports Dashboard
						</h1>
						<p className="mt-2 text-slate-600">
							Patient growth, appointment outcomes, and billing
							performance.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link
							to="/"
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Back to Home
						</Link>
						<Link
							to="/appointments"
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Appointments
						</Link>
						<Link
							to="/billing"
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Billing
						</Link>
						{onLogout && (
							<button
								onClick={onLogout}
								className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
							>
								Logout
							</button>
						)}
					</div>
				</div>

				{isLoading && (
					<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
						<p className="text-sm text-slate-600">
							Loading reports...
						</p>
					</section>
				)}

				{!isLoading && error && (
					<section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-xl shadow-red-100/60 sm:p-8">
						<p className="text-sm font-semibold">{error}</p>
					</section>
				)}

				{!isLoading && data && (
					<>
						<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
							<div className="mb-5">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
									Patients
								</p>
								<h2 className="mt-3 text-2xl font-bold text-slate-800">
									New Patients Per Month
								</h2>
							</div>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
								{data.new_patients_per_month.map((point) => {
									const barHeight = Math.max(
										8,
										Math.round(
											(point.count / maxMonthlyCount) *
												120,
										),
									);
									return (
										<div
											key={point.month}
											className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
										>
											<div className="flex h-32 items-end">
												<div
													className="w-full rounded-lg bg-teal-500"
													style={{
														height: `${barHeight}px`,
													}}
												/>
											</div>
											<p className="mt-3 text-xs font-semibold text-slate-500">
												{formatMonthLabel(point.month)}
											</p>
											<p className="text-lg font-bold text-slate-800">
												{point.count}
											</p>
										</div>
									);
								})}
							</div>
						</section>

						<section className="grid gap-6 lg:grid-cols-2">
							<article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
									Appointments
								</p>
								<h2 className="mt-3 text-2xl font-bold text-slate-800">
									Completion Rate
								</h2>
								<p className="mt-2 text-sm text-slate-600">
									Based on past appointments only.
								</p>

								<div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
									<p className="text-4xl font-bold text-teal-800">
										{data.appointment_completion_rate.rate.toFixed(
											1,
										)}
										%
									</p>
									<p className="mt-1 text-sm text-teal-900/80">
										{
											data.appointment_completion_rate
												.completed
										}{" "}
										completed of{" "}
										{data.appointment_completion_rate.total}{" "}
										total
									</p>
								</div>

								<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
										<p className="text-xs uppercase tracking-[0.16em] text-slate-500">
											Completed
										</p>
										<p className="mt-1 text-xl font-semibold text-slate-900">
											{
												data.appointment_completion_rate
													.completed
											}
										</p>
									</div>
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
										<p className="text-xs uppercase tracking-[0.16em] text-slate-500">
											Cancelled
										</p>
										<p className="mt-1 text-xl font-semibold text-slate-900">
											{
												data.appointment_completion_rate
													.cancelled
											}
										</p>
									</div>
								</div>
							</article>

							<article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
									Revenue
								</p>
								<h2 className="mt-3 text-2xl font-bold text-slate-800">
									Revenue Summary
								</h2>

								<div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
										<p className="text-xs uppercase tracking-[0.16em] text-slate-500">
											Invoiced
										</p>
										<p className="mt-1 text-xl font-semibold text-slate-900">
											{formatCurrency(
												data.revenue_summary
													.total_invoiced,
											)}
										</p>
									</div>
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
										<p className="text-xs uppercase tracking-[0.16em] text-slate-500">
											Collected
										</p>
										<p className="mt-1 text-xl font-semibold text-emerald-700">
											{formatCurrency(
												data.revenue_summary
													.total_collected,
											)}
										</p>
									</div>
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
										<p className="text-xs uppercase tracking-[0.16em] text-slate-500">
											Outstanding
										</p>
										<p className="mt-1 text-xl font-semibold text-amber-700">
											{formatCurrency(
												data.revenue_summary
													.outstanding,
											)}
										</p>
									</div>
								</div>

								<p className="mt-4 text-sm text-slate-600">
									{data.revenue_summary.invoice_count}{" "}
									invoices and{" "}
									{data.revenue_summary.payment_count}{" "}
									payments recorded.
								</p>
							</article>
						</section>

						<section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
							<div className="mb-5">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
									Services
								</p>
								<h2 className="mt-3 text-2xl font-bold text-slate-800">
									Top Services
								</h2>
							</div>

							{data.top_services.length === 0 ? (
								<p className="text-sm text-slate-600">
									No service revenue yet.
								</p>
							) : (
								<div className="overflow-x-auto rounded-2xl border border-slate-200">
									<table className="min-w-full divide-y divide-slate-200">
										<thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
											<tr>
												<th className="px-4 py-3 font-semibold">
													Service
												</th>
												<th className="px-4 py-3 font-semibold">
													Invoices
												</th>
												<th className="px-4 py-3 font-semibold">
													Revenue
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
											{data.top_services.map(
												(service) => (
													<tr key={service.service}>
														<td className="px-4 py-3 font-medium text-slate-900">
															{service.service}
														</td>
														<td className="px-4 py-3">
															{
																service.invoice_count
															}
														</td>
														<td className="px-4 py-3">
															{formatCurrency(
																service.revenue,
															)}
														</td>
													</tr>
												),
											)}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</>
				)}
			</div>
		</main>
	);
}
