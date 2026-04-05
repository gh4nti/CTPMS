const form = document.getElementById("patient-form");
const list = document.getElementById("list");
const status = document.getElementById("status");
const count = document.getElementById("count");
const fullNameInput = document.getElementById("fullName");

function prettyStatus(rawStatus) {
	if (!rawStatus) {
		return "unknown";
	}

	return rawStatus
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function setStatus(message, isError = false) {
	status.textContent = message;
	status.classList.toggle("is-error", isError);
}

function renderPatients(patients) {
	list.innerHTML = "";
	count.textContent = `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`;

	if (patients.length === 0) {
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "No patient records yet. Add the first one above.";
		list.appendChild(empty);
		return;
	}

	patients.forEach((patient) => {
		const li = document.createElement("li");
		li.className = "patient-item";

		const heading = document.createElement("div");
		heading.className = "patient-heading";

		const name = document.createElement("span");
		name.className = "patient-name";
		name.textContent = patient.full_name;

		const statusPill = document.createElement("span");
		statusPill.className = "status-pill";
		statusPill.textContent = prettyStatus(patient.enrollment_status);

		heading.appendChild(name);
		heading.appendChild(statusPill);

		const meta = document.createElement("div");
		meta.className = "patient-meta";
		meta.innerHTML = `
			<div><span class="meta-key">Trial:</span> ${patient.trial_code}</div>
			<div><span class="meta-key">DOB:</span> ${patient.dob}</div>
			<div><span class="meta-key">Gender:</span> ${patient.gender}</div>
			<div><span class="meta-key">Condition:</span> ${patient.patient_condition}</div>
			<div><span class="meta-key">Phone:</span> ${patient.phone || "-"}</div>
		`;

		const notes = document.createElement("p");
		notes.className = "lede";
		notes.textContent = patient.notes
			? `Notes: ${patient.notes}`
			: "Notes: -";

		li.appendChild(heading);
		li.appendChild(meta);
		li.appendChild(notes);
		list.appendChild(li);
	});
}

async function loadPatients() {
	try {
		const res = await fetch("/patients");
		if (!res.ok) {
			throw new Error("Request failed");
		}
		const patients = await res.json();
		renderPatients(patients);
	} catch (error) {
		setStatus("Could not load patient records.", true);
	}
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const formData = new FormData(form);

	const payload = {
		fullName: String(formData.get("fullName") || "").trim(),
		dob: String(formData.get("dob") || "").trim(),
		gender: String(formData.get("gender") || "").trim(),
		trialCode: String(formData.get("trialCode") || "").trim(),
		condition: String(formData.get("condition") || "").trim(),
		status: String(formData.get("status") || "").trim(),
		phone: String(formData.get("phone") || "").trim(),
		notes: String(formData.get("notes") || "").trim(),
	};

	if (
		!payload.fullName ||
		!payload.dob ||
		!payload.trialCode ||
		!payload.condition ||
		!payload.gender ||
		!payload.status
	) {
		setStatus("Please fill in all required patient fields.", true);
		fullNameInput.focus();
		return;
	}

	setStatus("Saving patient record...");

	try {
		const response = await fetch("/patients", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			throw new Error(errorBody.error || "Request failed");
		}

		form.reset();
		setStatus(`Patient ${payload.fullName} added successfully.`);
		loadPatients();
		fullNameInput.focus();
	} catch (error) {
		setStatus(`Could not add patient: ${error.message}`, true);
	}
});

loadPatients();
