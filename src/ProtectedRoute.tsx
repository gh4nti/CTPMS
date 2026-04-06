import { ReactNode } from "react";
import Login from "./Login";

interface ProtectedRouteProps {
	isAuthenticated: boolean;
	onLogin: (username: string, password: string) => void;
	isLoading?: boolean;
	error?: string;
	children: ReactNode;
}

export default function ProtectedRoute({
	isAuthenticated,
	onLogin,
	isLoading = false,
	error,
	children,
}: ProtectedRouteProps) {
	if (!isAuthenticated) {
		return <Login onLogin={onLogin} isLoading={isLoading} error={error} />;
	}

	return <>{children}</>;
}
