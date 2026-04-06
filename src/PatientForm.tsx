import { ChangeEvent, FormEvent, useEffect, useState } from "react";

export interface FormState {
	fullName: string;
	dob: string;
	gender: string;
	phone: string;
	email: string;
	heightCm: string;
	weightKg: string;
	bloodGroup: string;
}

export interface PatientFormProps {
	mode: "create" | "edit";
	initialData?: Partial<FormState>;
	onSubmit: (data: FormState) => Promise<void>;
	isLoading?: boolean;
	onCancel?: () => void;
}

interface ValidationError {
	field: string;
	message: string;
}

const initialForm: FormState = {
	fullName: "",
	dob: "",
	gender: "",
	phone: "",
	email: "",
	heightCm: "",
	weightKg: "",
	bloodGroup: "",
};

export default function PatientForm({
	mode,
	initialData,
	onSubmit,
	isLoading = false,
	onCancel,
}: PatientFormProps) {
	const [form, setForm] = useState<FormState>(initialForm);
	const [errors, setErrors] = useState<ValidationError[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	useEffect(() => {
		if (initialData) {
			const merged = { ...form };
			Object.entries(initialData).forEach(([key, value]) => {
				if (key in merged) {
					(merged as Record<string, string>)[key] = value || "";
				}
			});
			setForm(merged);
		}
	}, [initialData]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () =>
			window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	function updateField(
		event: ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
		setHasUnsavedChanges(true);
		setErrors((current) => current.filter((err) => err.field !== name));
	}

	function validateForm(): boolean {
		const newErrors: ValidationError[] = [];

		if (!form.fullName.trim()) {
			newErrors.push({
				field: "fullName",
				message: "Full name is required",
			});
		}

		if (!form.dob.trim()) {
			newErrors.push({
				field: "dob",
				message: "Date of birth is required",
			});
		} else {
			const dobDate = new Date(form.dob);
			const today = new Date();
			if (dobDate > today) {
				newErrors.push({
					field: "dob",
					message: "Date of birth cannot be in the future",
				});
			}
			const age = today.getFullYear() - dobDate.getFullYear();
			if (age < 0 || age > 150) {
				newErrors.push({
					field: "dob",
					message: "Age must be between 0 and 150 years",
				});
			}
		}

		if (!form.gender.trim()) {
			newErrors.push({
				field: "gender",
				message: "Gender is required",
			});
		}

		if (!form.phone.trim()) {
			newErrors.push({
				field: "phone",
				message: "Phone number is required",
			});
		} else if (!/^\+?[\d\s\-()]{7,}$/i.test(form.phone.trim())) {
			newErrors.push({
				field: "phone",
				message: "Please enter a valid phone number",
			});
		}

		if (!form.email.trim()) {
			newErrors.push({
				field: "email",
				message: "Email is required",
			});
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
			newErrors.push({
				field: "email",
				message: "Please enter a valid email address",
			});
		}

		if (!form.heightCm.trim()) {
			newErrors.push({
				field: "heightCm",
				message: "Height is required",
			});
		} else {
			const height = Number(form.heightCm);
			if (!Number.isFinite(height) || height <= 0 || height > 300) {
				newErrors.push({
					field: "heightCm",
					message: "Height must be between 1 and 300 cm",
				});
			}
		}

		if (!form.weightKg.trim()) {
			newErrors.push({
				field: "weightKg",
				message: "Weight is required",
			});
		} else {
			const weight = Number(form.weightKg);
			if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
				newErrors.push({
					field: "weightKg",
					message: "Weight must be between 1 and 500 kg",
				});
			}
		}

		if (!form.bloodGroup.trim()) {
			newErrors.push({
				field: "bloodGroup",
				message: "Blood group is required",
			});
		}

		setErrors(newErrors);
		return newErrors.length === 0;
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!validateForm()) {
			setError("Please fix the validation errors above");
			return;
		}

		setIsSaving(true);
		setError("");

		try {
			await onSubmit(form);
			setHasUnsavedChanges(false);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "An error occurred while saving",
			);
		} finally {
			setIsSaving(false);
		}
	}

	const getFieldError = (fieldName: string) => {
		return errors.find((err) => err.field === fieldName)?.message;
	};

	const fieldClasses = (fieldName: string) => {
		const baseClasses =
			"mt-1 w-full rounded-xl border bg-white px-3 py-2 text-slate-900 outline-none transition";
		const errorClasses = getFieldError(fieldName)
			? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
			: "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200";
		return `${baseClasses} ${errorClasses}`;
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			{/* Validation Errors Summary */}
			{errors.length > 0 && (
				<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
					<h3 className="text-sm font-semibold text-red-800">
						Please fix the following errors:
					</h3>
					<ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
						{errors.map((err) => (
							<li key={err.field}>{err.message}</li>
						))}
					</ul>
				</div>
			)}

			{/* Generic Error Message */}
			{error && (
				<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}

			{/* Form Fields */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{/* Full Name */}
				<label className="text-sm font-medium text-slate-700">
					Full name *
					<input
						type="text"
						name="fullName"
						value={form.fullName}
						onChange={updateField}
						placeholder="Jane Doe"
						disabled={isSaving || isLoading}
						className={fieldClasses("fullName")}
					/>
					{getFieldError("fullName") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("fullName")}
						</p>
					)}
				</label>

				{/* Date of Birth */}
				<label className="text-sm font-medium text-slate-700">
					Date of birth *
					<input
						type="date"
						name="dob"
						value={form.dob}
						onChange={updateField}
						disabled={isSaving || isLoading}
						className={fieldClasses("dob")}
					/>
					{getFieldError("dob") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("dob")}
						</p>
					)}
				</label>

				{/* Gender */}
				<label className="text-sm font-medium text-slate-700">
					Gender *
					<select
						name="gender"
						value={form.gender}
						onChange={updateField}
						disabled={isSaving || isLoading}
						className={fieldClasses("gender")}
					>
						<option value="">Select gender</option>
						<option value="Female">Female</option>
						<option value="Male">Male</option>
						<option value="Other">Non-binary</option>
						<option value="Unknown">Prefer not to say</option>
					</select>
					{getFieldError("gender") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("gender")}
						</p>
					)}
				</label>

				{/* Phone */}
				<label className="text-sm font-medium text-slate-700">
					Phone number *
					<input
						type="tel"
						name="phone"
						value={form.phone}
						onChange={updateField}
						placeholder="+1 555 123 4567"
						disabled={isSaving || isLoading}
						className={fieldClasses("phone")}
					/>
					{getFieldError("phone") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("phone")}
						</p>
					)}
				</label>

				{/* Email */}
				<label className="text-sm font-medium text-slate-700">
					Email *
					<input
						type="email"
						name="email"
						value={form.email}
						onChange={updateField}
						placeholder="jane.doe@example.com"
						disabled={isSaving || isLoading}
						className={fieldClasses("email")}
					/>
					{getFieldError("email") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("email")}
						</p>
					)}
				</label>

				{/* Height */}
				<label className="text-sm font-medium text-slate-700">
					Height (cm) *
					<input
						type="number"
						name="heightCm"
						value={form.heightCm}
						onChange={updateField}
						placeholder="170"
						min="1"
						step="0.1"
						disabled={isSaving || isLoading}
						className={fieldClasses("heightCm")}
					/>
					{getFieldError("heightCm") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("heightCm")}
						</p>
					)}
				</label>

				{/* Weight */}
				<label className="text-sm font-medium text-slate-700">
					Weight (kg) *
					<input
						type="number"
						name="weightKg"
						value={form.weightKg}
						onChange={updateField}
						placeholder="65"
						min="1"
						step="0.1"
						disabled={isSaving || isLoading}
						className={fieldClasses("weightKg")}
					/>
					{getFieldError("weightKg") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("weightKg")}
						</p>
					)}
				</label>

				{/* Blood Group */}
				<label className="text-sm font-medium text-slate-700">
					Blood group *
					<select
						name="bloodGroup"
						value={form.bloodGroup}
						onChange={updateField}
						disabled={isSaving || isLoading}
						className={fieldClasses("bloodGroup")}
					>
						<option value="">Select blood group</option>
						<option value="A+">A+</option>
						<option value="A-">A-</option>
						<option value="B+">B+</option>
						<option value="B-">B-</option>
						<option value="AB+">AB+</option>
						<option value="AB-">AB-</option>
						<option value="O+">O+</option>
						<option value="O-">O-</option>
					</select>
					{getFieldError("bloodGroup") && (
						<p className="mt-1 text-xs text-red-600">
							{getFieldError("bloodGroup")}
						</p>
					)}
				</label>

				{/* Info Banner */}
				<div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 sm:col-span-2">
					{mode === "create"
						? "Patient ID is assigned automatically from existing patient records."
						: "Changes will be saved to the patient record."}
				</div>
			</div>

			{/* Unsaved Changes Warning */}
			{hasUnsavedChanges && mode === "edit" && (
				<div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					You have unsaved changes. Please save or discard them before
					leaving.
				</div>
			)}

			{/* Buttons */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex gap-3">
					<button
						type="submit"
						disabled={isSaving || isLoading}
						className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
					>
						{isSaving
							? "Saving..."
							: mode === "create"
								? "Add patient record"
								: "Save changes"}
					</button>

					{onCancel && (
						<button
							type="button"
							onClick={onCancel}
							disabled={isSaving || isLoading}
							className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Cancel
						</button>
					)}
				</div>
			</div>
		</form>
	);
}
