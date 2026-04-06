/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				ink: "#1f2937",
				paper: "#f8fafc",
				brand: "#0f766e",
			},
		},
	},
	plugins: [],
};
