import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import AllPatients from "./AllPatients";
import PatientProfile from "./PatientProfile";
import ProtectedRoute from "./ProtectedRoute";
import "./index.css";

const AUTH_EXPIRY_KEY = "ctpms_auth_expires_at";
const AUTH_DURATION_MS = 15 * 60 * 1000;

function readAuthFromStorage(): boolean {
	const rawExpiry = localStorage.getItem(AUTH_EXPIRY_KEY);
	if (!rawExpiry) {
		return false;
	}

	const expiryTime = Number(rawExpiry);
	if (!Number.isFinite(expiryTime) || Date.now() >= expiryTime) {
		localStorage.removeItem(AUTH_EXPIRY_KEY);
		return false;
	}

	return true;
}

function storeAuthExpiry() {
	localStorage.setItem(
		AUTH_EXPIRY_KEY,
		String(Date.now() + AUTH_DURATION_MS),
	);
}

function clearAuthExpiry() {
	localStorage.removeItem(AUTH_EXPIRY_KEY);
}

function AppWrapper() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
		readAuthFromStorage(),
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		const timer = window.setInterval(() => {
			if (!readAuthFromStorage()) {
				setIsAuthenticated(false);
			}
		}, 30_000);

		return () => {
			window.clearInterval(timer);
		};
	}, [isAuthenticated]);

	const handleLogin = async (username: string, password: string) => {
		setIsLoading(true);
		setError("");

		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Check credentials: only admin / 123
		if (username === "admin" && password === "123") {
			storeAuthExpiry();
			setIsAuthenticated(true);
		} else {
			setError("Invalid username or password");
		}

		setIsLoading(false);
	};

	const handleLogout = () => {
		clearAuthExpiry();
		setIsAuthenticated(false);
	};

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<App onLogout={handleLogout} />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/patients/:id"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<PatientProfile onLogout={handleLogout} />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/all-patients"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<AllPatients onLogout={handleLogout} />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<React.StrictMode>
		<AppWrapper />
	</React.StrictMode>,
);
