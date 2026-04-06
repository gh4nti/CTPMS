const ARCHIVE_STORAGE_KEY = "ctpms_archived_patients";

export function readArchivedPatientIds(): number[] {
	if (typeof window === "undefined") {
		return [];
	}

	const rawValue = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
	if (!rawValue) {
		return [];
	}

	try {
		const parsed = JSON.parse(rawValue) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value > 0);
	} catch {
		return [];
	}
}

export function writeArchivedPatientIds(patientIds: number[]) {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		ARCHIVE_STORAGE_KEY,
		JSON.stringify(Array.from(new Set(patientIds))),
	);
}
