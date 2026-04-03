async function loadUsers() {
	const res = await fetch("/users");
	const users = await res.json();

	const list = document.getElementById("list");
	list.innerHTML = "";

	users.forEach((u) => {
		const li = document.createElement("li");
		li.textContent = u.name;
		list.appendChild(li);
	});
}

async function addUser() {
	const name = document.getElementById("name").value;

	await fetch("/users", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});

	loadUsers();
}

loadUsers();
