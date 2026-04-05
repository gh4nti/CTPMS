const form = document.getElementById("user-form");
const nameInput = document.getElementById("name");
const list = document.getElementById("list");
const status = document.getElementById("status");
const count = document.getElementById("count");

function setStatus(message, isError = false) {
	status.textContent = message;
	status.classList.toggle("is-error", isError);
}

function renderUsers(users) {
	list.innerHTML = "";
	count.textContent = `${users.length} ${users.length === 1 ? "user" : "users"}`;

	if (users.length === 0) {
		const empty = document.createElement("li");
		empty.className = "empty-state";
		empty.textContent = "No users yet. Add the first one above.";
		list.appendChild(empty);
		return;
	}

	users.forEach((user, index) => {
		const li = document.createElement("li");
		li.className = "user-item";

		const badge = document.createElement("span");
		badge.className = "user-index";
		badge.textContent = String(index + 1).padStart(2, "0");

		const name = document.createElement("span");
		name.className = "user-name";
		name.textContent = user.name;

		li.appendChild(badge);
		li.appendChild(name);
		list.appendChild(li);
	});
}

async function loadUsers() {
	try {
		const res = await fetch("/users");
		const users = await res.json();
		renderUsers(users);
	} catch (error) {
		setStatus("Could not load users.", true);
	}
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	const name = nameInput.value.trim();

	if (!name) {
		setStatus("Enter a name before adding a user.", true);
		nameInput.focus();
		return;
	}

	try {
		const response = await fetch("/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});

		if (!response.ok) {
			throw new Error("Request failed");
		}

		nameInput.value = "";
		setStatus(`Added ${name}.`);
		loadUsers();
		nameInput.focus();
	} catch (error) {
		setStatus("Could not add user.", true);
	}
});

loadUsers();
