import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Appointments from "./Appointments";
import AllPatients from "./AllPatients";
import PatientProfile from "./PatientProfile";
import { Billing } from "./features/billing";
import ProtectedRoute from "./ProtectedRoute";
import {
	AuthUser,
	clearAuthSession,
	persistAuthSession,
	readAuthSession,
} from "./auth";
import "./index.css";

function AppWrapper() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
		readAuthSession(),
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const isAuthenticated = Boolean(authUser);

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		const timer = window.setInterval(() => {
			if (!readAuthSession()) {
				setAuthUser(null);
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

		const normalizedUsername = username.trim().toLowerCase();

		let nextUser: AuthUser | null = null;
		if (normalizedUsername === "admin" && password === "123") {
			nextUser = { username: "admin", role: "admin" };
		} else if (normalizedUsername === "guest" && password === "123") {
			nextUser = { username: "guest", role: "guest" };
		}

		if (nextUser) {
			persistAuthSession(nextUser);
			setAuthUser(nextUser);
		} else {
			setError("Invalid username or password");
		}

		setIsLoading(false);
	};

	const handleLogout = () => {
		clearAuthSession();
		setAuthUser(null);
	};

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<App
								onLogout={handleLogout}
								currentUser={authUser}
							/>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/patients/:id"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<PatientProfile
								onLogout={handleLogout}
								currentUser={authUser}
							/>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/patients/:id/edit"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							requiredPermission="patients:edit"
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<PatientProfile
								onLogout={handleLogout}
								currentUser={authUser}
							/>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/all-patients"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<AllPatients
								onLogout={handleLogout}
								currentUser={authUser}
							/>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/appointments"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<Appointments currentUser={authUser} />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/billing"
					element={
						<ProtectedRoute
							isAuthenticated={isAuthenticated}
							authUser={authUser}
							onLogin={handleLogin}
							isLoading={isLoading}
							error={error}
						>
							<Billing currentUser={authUser} />
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
