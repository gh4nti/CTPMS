import { ReactNode } from "react";
import Login from "./Login";
import { AuthUser, Permission, hasPermission } from "./auth";

interface ProtectedRouteProps {
	isAuthenticated: boolean;
	authUser: AuthUser | null;
	onLogin: (username: string, password: string) => void;
	isLoading?: boolean;
	error?: string;
	requiredPermission?: Permission;
	children: ReactNode;
}

export default function ProtectedRoute({
	isAuthenticated,
	authUser,
	onLogin,
	isLoading = false,
	error,
	requiredPermission,
	children,
}: ProtectedRouteProps) {
	if (!isAuthenticated) {
		return <Login onLogin={onLogin} isLoading={isLoading} error={error} />;
	}

	if (
		requiredPermission &&
		authUser &&
		!hasPermission(authUser.role, requiredPermission)
	) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
				<div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
					<h1 className="text-2xl font-bold text-slate-800">
						Access denied
					</h1>
					<p className="mt-3 text-slate-600">
						Your role does not have permission to access this route.
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
