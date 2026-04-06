import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Patient } from "./features/patients/types";
import {
	cancelAppointment,
	createAppointment,
	fetchAppointments,
	fetchPatients,
	updateAppointment,
	ApiError,
} from "./features/appointments/api";
import {
	Appointment,
	AppointmentFormState,
	AppointmentStatus,
} from "./features/appointments/types";
import { AuthUser, hasPermission } from "./auth";

type CalendarMode = "daily" | "weekly";

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function getTodayInputValue(): string {
	const today = new Date();
	return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
		today.getDate(),
	)}`;
}

function toLocalDateTimeInputValue(isoValue: string): string {
	const date = new Date(isoValue);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate(),
	)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateInput(dateValue: string): Date | null {
	const parsed = new Date(`${dateValue}T00:00:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return nextDate;
}

function startOfWeek(date: Date): Date {
	const dayOffset = (date.getDay() + 6) % 7;
	return addDays(startOfDay(date), -dayOffset);
}

function getDateInputValue(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate(),
	)}`;
}

function formatShortDayLabel(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	}).format(date);
}

function formatTimeRange(startTime: string, endTime: string): string {
	const formatter = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	return `${formatter.format(new Date(startTime))} - ${formatter.format(
		new Date(endTime),
	)}`;
}

function formatDuration(startTime: string, endTime: string): string {
	const minutes = Math.max(
		0,
		Math.round(
			(new Date(endTime).getTime() - new Date(startTime).getTime()) /
				60000,
		),
	);

	return `${minutes} min`;
}

function appointmentStatusClass(status: AppointmentStatus): string {
	return status === "cancelled"
		? "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30"
		: "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30";
}

function appointmentAccentClass(status: AppointmentStatus): string {
	return status === "cancelled" ? "border-l-rose-400" : "border-l-teal-400";
}

function emptyForm(patientId: string): AppointmentFormState {
	const todayValue = getTodayInputValue();
	return {
		patientId,
		title: "Clinical appointment",
		startTime: `${todayValue}T09:00`,
		endTime: `${todayValue}T09:30`,
		location: "",
		notes: "",
	};
}

function isEndBeforeStart(startTime: string, endTime: string): boolean {
	if (!startTime || !endTime) {
		return false;
	}

	return new Date(endTime).getTime() < new Date(startTime).getTime();
}

interface AppointmentCardProps {
	appointment: Appointment;
	onEdit: (appointment: Appointment) => void;
	onCancel: (appointment: Appointment) => void;
	canManageActions: boolean;
	compact?: boolean;
}

function AppointmentCard({
	appointment,
	onEdit,
	onCancel,
	canManageActions,
	compact = false,
}: AppointmentCardProps) {
	return (
		<div
			className={`rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-teal-400/40 hover:shadow-xl ${appointmentAccentClass(
				appointment.status,
			)}`}
		>
			<div
				className={`flex gap-4 ${compact ? "flex-col" : "items-start justify-between"}`}
			>
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-slate-100">
						{appointment.title}
					</p>
					<p className="mt-1 truncate text-sm text-slate-400">
						{appointment.patient_name}
					</p>
				</div>
				<span
					className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${appointmentStatusClass(
						appointment.status,
					)}`}
				>
					{appointment.status}
				</span>
			</div>

			<div className="mt-4 grid gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
				<div
					className={`flex gap-3 ${compact ? "flex-col" : "items-center justify-between"}`}
				>
					<span className="text-slate-500">Time</span>
					<span
						className={`font-medium text-slate-100 ${compact ? "text-base leading-6" : "text-right"}`}
					>
						{formatTimeRange(
							appointment.start_time,
							appointment.end_time,
						)}
					</span>
				</div>
				<div
					className={`flex gap-3 ${compact ? "flex-col" : "items-center justify-between"}`}
				>
					<span className="text-slate-500">Duration</span>
					<span
						className={`font-medium text-slate-100 ${compact ? "text-base" : "text-right"}`}
					>
						{formatDuration(
							appointment.start_time,
							appointment.end_time,
						)}
					</span>
				</div>
				{appointment.location && (
					<div
						className={`flex gap-3 ${compact ? "flex-col" : "items-start justify-between"}`}
					>
						<span className="text-slate-500">Location</span>
						<span
							className={`font-medium text-slate-100 ${compact ? "text-base leading-6" : "max-w-[12rem] text-right"}`}
						>
							{appointment.location}
						</span>
					</div>
				)}
			</div>

			{appointment.notes && (
				<p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
					{appointment.notes}
				</p>
			)}

			{canManageActions && (
				<div
					className={`mt-4 flex gap-2 ${compact ? "flex-col" : "flex-wrap"}`}
				>
					<button
						type="button"
						onClick={() => onEdit(appointment)}
						className={`rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-teal-400 hover:bg-slate-800 ${compact ? "w-full" : ""}`}
					>
						Reschedule
					</button>
					{appointment.status !== "cancelled" && (
						<button
							type="button"
							onClick={() => onCancel(appointment)}
							className={`rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 ${compact ? "w-full" : ""}`}
						>
							Cancel
						</button>
					)}
				</div>
			)}
		</div>
	);
}

function appointmentSort(a: Appointment, b: Appointment): number {
	return a.start_time.localeCompare(b.start_time);
}

export default function Appointments({
	currentUser,
}: {
	currentUser: AuthUser | null;
}) {
	const [searchParams] = useSearchParams();
	const initialPatientId = searchParams.get("patientId") || "";
	const [patients, setPatients] = useState<Patient[]>([]);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [activeMode, setActiveMode] = useState<CalendarMode>("weekly");
	const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
	const [formState, setFormState] = useState<AppointmentFormState>(() =>
		emptyForm(initialPatientId),
	);
	const [editingAppointmentId, setEditingAppointmentId] = useState<
		number | null
	>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const canManageAppointments = Boolean(
		currentUser && hasPermission(currentUser.role, "appointments:write"),
	);

	const selectedDateObject = useMemo(
		() => parseDateInput(selectedDate) || new Date(),
		[selectedDate],
	);

	const range = useMemo(() => {
		if (activeMode === "daily") {
			const start = startOfDay(selectedDateObject);
			return { start, end: addDays(start, 1) };
		}

		const start = startOfWeek(selectedDateObject);
		return { start, end: addDays(start, 7) };
	}, [activeMode, selectedDateObject]);

	const weeklyDays = useMemo(() => {
		const days: Date[] = [];
		for (let index = 0; index < 7; index += 1) {
			days.push(addDays(range.start, index));
		}
		return days;
	}, [range.start]);

	const appointmentsByDate = useMemo(() => {
		return appointments.reduce<Record<string, Appointment[]>>(
			(acc, item) => {
				const key = getDateInputValue(new Date(item.start_time));
				acc[key] = acc[key] || [];
				acc[key].push(item);
				return acc;
			},
			{},
		);
	}, [appointments]);

	const dayAppointments = useMemo(() => {
		const dateKey = getDateInputValue(selectedDateObject);
		return (appointmentsByDate[dateKey] || [])
			.slice()
			.sort(appointmentSort);
	}, [appointmentsByDate, selectedDateObject]);

	const activeAppointments = useMemo(
		() =>
			appointments.filter(
				(appointment) => appointment.status !== "cancelled",
			),
		[appointments],
	);

	const hasInvalidRange = isEndBeforeStart(
		formState.startTime,
		formState.endTime,
	);

	async function loadAppointments() {
		setIsLoading(true);
		setIsError(false);

		try {
			const [patientRows, appointmentRows] = await Promise.all([
				fetchPatients(),
				fetchAppointments({
					from: range.start.toISOString(),
					to: range.end.toISOString(),
				}),
			]);

			setPatients(patientRows);
			setAppointments(appointmentRows.slice().sort(appointmentSort));
		} catch (err) {
			setIsError(true);
			setMessage(
				err instanceof Error
					? err.message
					: "Could not load appointments.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadAppointments();
	}, [activeMode, range.start.getTime(), range.end.getTime()]);

	function startEditingAppointment(appointment: Appointment) {
		if (!canManageAppointments) {
			setIsError(true);
			setMessage("You do not have permission to edit appointments.");
			return;
		}

		setEditingAppointmentId(appointment.id);
		setFormState({
			patientId: String(appointment.patient_id),
			title: appointment.title,
			startTime: toLocalDateTimeInputValue(appointment.start_time),
			endTime: toLocalDateTimeInputValue(appointment.end_time),
			location: appointment.location,
			notes: appointment.notes,
		});
		setMessage(`Editing appointment for ${appointment.patient_name}.`);
		setIsError(false);
	}

	function cancelEditing() {
		setEditingAppointmentId(null);
		setFormState(emptyForm(initialPatientId));
		setMessage("");
		setIsError(false);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canManageAppointments) {
			setIsError(true);
			setMessage("You do not have permission to update appointments.");
			return;
		}

		setIsSaving(true);
		setIsError(false);
		setMessage(
			editingAppointmentId
				? "Rescheduling appointment..."
				: "Booking appointment...",
		);

		try {
			const payload = {
				patientId: formState.patientId,
				title: formState.title.trim(),
				startTime: formState.startTime,
				endTime: formState.endTime,
				location: formState.location.trim(),
				notes: formState.notes.trim(),
			};

			if (
				!payload.patientId ||
				!payload.title ||
				!payload.startTime ||
				!payload.endTime
			) {
				throw new Error(
					"Fill in the patient, title, start time, and end time.",
				);
			}

			if (isEndBeforeStart(payload.startTime, payload.endTime)) {
				throw new Error("End time must be after start time.");
			}

			if (editingAppointmentId) {
				await updateAppointment(editingAppointmentId, payload);
				setMessage("Appointment rescheduled.");
			} else {
				await createAppointment(payload);
				setMessage("Appointment booked.");
			}

			setEditingAppointmentId(null);
			setFormState(emptyForm(payload.patientId));
			await loadAppointments();
		} catch (err) {
			setIsError(true);
			setMessage(
				err instanceof ApiError && err.details
					? `${err.message} (${err.details})`
					: err instanceof Error
						? err.message
						: "Could not save appointment.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleCancelAppointment(appointment: Appointment) {
		if (!canManageAppointments) {
			setIsError(true);
			setMessage("You do not have permission to cancel appointments.");
			return;
		}

		const confirmed = window.confirm(
			`Cancel the appointment for ${appointment.patient_name}?`,
		);

		if (!confirmed) {
			return;
		}

		setIsError(false);
		setMessage("Cancelling appointment...");

		try {
			await cancelAppointment(appointment.id);
			if (editingAppointmentId === appointment.id) {
				cancelEditing();
			}
			setMessage("Appointment cancelled.");
			await loadAppointments();
		} catch (err) {
			setIsError(true);
			setMessage(
				err instanceof ApiError && err.details
					? `${err.message} (${err.details})`
					: err instanceof Error
						? err.message
						: "Could not cancel appointment.",
			);
		}
	}

	const selectedPatientName = useMemo(
		() =>
			patients.find(
				(patient) => String(patient.id) === formState.patientId,
			)?.full_name,
		[formState.patientId, patients],
	);

	return (
		<main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
				<section className="overflow-hidden rounded-[32px] border border-slate-700/80 bg-slate-950/80 shadow-2xl shadow-slate-950/30 backdrop-blur">
					<div className="flex flex-col gap-6 border-b border-slate-800/80 p-6 md:flex-row md:items-end md:justify-between md:p-8">
						<div className="max-w-3xl">
							<p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300/90">
								Appointments Module
							</p>
							<h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
								Clinic Scheduling
							</h1>
							<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
								Book, reschedule, and cancel appointments from
								one clean schedule view with overlap checks
								built in.
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<Link
								to="/"
								className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-teal-400/40 hover:bg-slate-800"
							>
								Home
							</Link>
							<Link
								to="/all-patients"
								className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-teal-400/40 hover:bg-slate-800"
							>
								All Patients
							</Link>
						</div>
					</div>

					<div className="grid gap-4 border-b border-slate-800/80 px-6 py-5 md:grid-cols-3 md:px-8">
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
								Appointments in range
							</p>
							<p className="mt-2 text-3xl font-semibold text-slate-50">
								{appointments.length}
							</p>
						</div>
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
								Active appointments
							</p>
							<p className="mt-2 text-3xl font-semibold text-slate-50">
								{activeAppointments.length}
							</p>
						</div>
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
								Selected day
							</p>
							<p className="mt-2 text-lg font-semibold text-slate-50">
								{formatShortDayLabel(selectedDateObject)}
							</p>
						</div>
					</div>
				</section>

				{message && (
					<div
						className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${isError ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"}`}
					>
						{message}
					</div>
				)}

				{!canManageAppointments && (
					<div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-lg">
						Read-only access: guest users can view appointments but
						cannot modify them.
					</div>
				)}

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
					<section className="rounded-[32px] border border-slate-700/80 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur xl:sticky xl:top-6 xl:self-start">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/90">
									Schedule
								</p>
								<h2 className="mt-2 text-2xl font-semibold text-slate-50">
									{editingAppointmentId
										? "Reschedule appointment"
										: "Book appointment"}
								</h2>
							</div>
							{editingAppointmentId && (
								<button
									type="button"
									onClick={cancelEditing}
									className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-teal-400/40 hover:bg-slate-800"
								>
									Cancel edit
								</button>
							)}
						</div>

						<form
							className="mt-6 space-y-4"
							onSubmit={handleSubmit}
						>
							<fieldset disabled={!canManageAppointments}>
								<div className="space-y-2">
									<label className="block text-sm font-medium text-slate-300">
										Patient
									</label>
									<select
										value={formState.patientId}
										onChange={(event) =>
											setFormState((current) => ({
												...current,
												patientId: event.target.value,
											}))
										}
										className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
									>
										<option value="">
											Choose a patient
										</option>
										{patients.map((patient) => (
											<option
												key={patient.id}
												value={patient.id}
											>
												{patient.full_name}
											</option>
										))}
									</select>
								</div>

								<div className="space-y-2">
									<label className="block text-sm font-medium text-slate-300">
										Title
									</label>
									<input
										type="text"
										value={formState.title}
										onChange={(event) =>
											setFormState((current) => ({
												...current,
												title: event.target.value,
											}))
										}
										className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<label className="block text-sm font-medium text-slate-300">
											Start
										</label>
										<input
											type="datetime-local"
											value={formState.startTime}
											onChange={(event) =>
												setFormState((current) => {
													const nextStartTime =
														event.target.value;
													return {
														...current,
														startTime:
															nextStartTime,
														endTime:
															isEndBeforeStart(
																nextStartTime,
																current.endTime,
															)
																? nextStartTime
																: current.endTime,
													};
												})
											}
											className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
										/>
									</div>
									<div className="space-y-2">
										<label className="block text-sm font-medium text-slate-300">
											End
										</label>
										<input
											type="datetime-local"
											min={formState.startTime}
											value={formState.endTime}
											onChange={(event) =>
												setFormState((current) => ({
													...current,
													endTime: event.target.value,
												}))
											}
											className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
										/>
									</div>
								</div>

								{hasInvalidRange && (
									<p className="text-sm text-rose-200">
										End time must be after start time.
									</p>
								)}

								<div className="space-y-2">
									<label className="block text-sm font-medium text-slate-300">
										Location
									</label>
									<input
										type="text"
										value={formState.location}
										onChange={(event) =>
											setFormState((current) => ({
												...current,
												location: event.target.value,
											}))
										}
										className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
									/>
								</div>

								<div className="space-y-2">
									<label className="block text-sm font-medium text-slate-300">
										Notes
									</label>
									<textarea
										value={formState.notes}
										onChange={(event) =>
											setFormState((current) => ({
												...current,
												notes: event.target.value,
											}))
										}
										rows={4}
										className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-400"
									/>
								</div>

								<button
									type="submit"
									disabled={
										isSaving ||
										hasInvalidRange ||
										!canManageAppointments
									}
									className="w-full rounded-2xl bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
								>
									{isSaving
										? editingAppointmentId
											? "Rescheduling..."
											: "Booking..."
										: editingAppointmentId
											? "Save reschedule"
											: "Book appointment"}
								</button>
							</fieldset>
						</form>

						<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
							{selectedPatientName ? (
								<span>
									Current patient selection:{" "}
									{selectedPatientName}
								</span>
							) : (
								<span>No patient selected yet.</span>
							)}
						</div>
					</section>

					<section className="rounded-[32px] border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur sm:p-8">
						<div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/90">
									Calendar
								</p>
								<h2 className="mt-2 text-2xl font-semibold text-slate-50">
									{activeMode === "daily"
										? "Daily view"
										: "Weekly view"}
								</h2>
								<p className="mt-2 text-sm text-slate-300">
									{activeMode === "daily"
										? formatShortDayLabel(
												selectedDateObject,
											)
										: `Week of ${formatShortDayLabel(range.start)}`}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<input
									type="date"
									value={selectedDate}
									onChange={(event) =>
										setSelectedDate(event.target.value)
									}
									className="rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-sm text-slate-100"
								/>
								<div className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/80 p-1">
									<button
										type="button"
										onClick={() => setActiveMode("daily")}
										className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${activeMode === "daily" ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
									>
										Daily
									</button>
									<button
										type="button"
										onClick={() => setActiveMode("weekly")}
										className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${activeMode === "weekly" ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
									>
										Weekly
									</button>
								</div>
							</div>
						</div>

						{isLoading ? (
							<div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-12 text-center text-slate-400">
								Loading appointments...
							</div>
						) : activeMode === "daily" ? (
							<div className="mt-6 space-y-4">
								{dayAppointments.length > 0 ? (
									dayAppointments.map((appointment) => (
										<AppointmentCard
											key={appointment.id}
											appointment={appointment}
											onEdit={startEditingAppointment}
											onCancel={handleCancelAppointment}
											canManageActions={
												canManageAppointments
											}
											compact
										/>
									))
								) : (
									<div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-14 text-center text-slate-400">
										No appointments for this day.
									</div>
								)}
							</div>
						) : (
							<div className="mt-6 max-h-[72vh] space-y-4 overflow-y-auto pr-1">
								{weeklyDays.map((day) => {
									const dayKey = getDateInputValue(day);
									const items = (
										appointmentsByDate[dayKey] || []
									)
										.slice()
										.sort(appointmentSort);
									const isToday =
										dayKey === getTodayInputValue();

									return (
										<div
											key={dayKey}
											className={`rounded-[28px] border p-5 ${isToday ? "border-teal-400/40 bg-teal-500/10" : "border-slate-700/80 bg-slate-900/55"}`}
										>
											<div className="flex flex-col gap-4 border-b border-slate-700/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
												<div>
													<p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/90">
														{day.toLocaleDateString(
															"en-US",
															{
																weekday:
																	"short",
															},
														)}
													</p>
													<p className="mt-2 text-lg font-semibold text-slate-50 sm:text-xl">
														{day.toLocaleDateString(
															"en-US",
															{
																month: "short",
																day: "numeric",
															},
														)}
													</p>
												</div>
												{items.length > 0 && (
													<span className="inline-flex w-fit rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
														{items.length}
													</span>
												)}
											</div>

											<div className="mt-4 space-y-3">
												{items.length > 0 ? (
													items.map((appointment) => (
														<AppointmentCard
															key={appointment.id}
															appointment={
																appointment
															}
															onEdit={
																startEditingAppointment
															}
															onCancel={
																handleCancelAppointment
															}
															canManageActions={
																canManageAppointments
															}
															compact
														/>
													))
												) : (
													<div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-500">
														Open
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</section>
				</div>
			</div>
		</main>
	);
}
