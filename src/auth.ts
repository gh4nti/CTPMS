export type Role = "admin" | "guest";

export type Permission =
	| "patients:create"
	| "patients:edit"
	| "patients:delete"
	| "appointments:write"
	| "billing:write"
	| "audit:read";

export interface AuthUser {
	username: string;
	role: Role;
}

export const AUTH_EXPIRY_KEY = "ctpms_auth_expires_at";
export const AUTH_USER_KEY = "ctpms_auth_user";

const AUTH_DURATION_MS = 15 * 60 * 1000;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
	admin: [
		"patients:create",
		"patients:edit",
		"patients:delete",
		"appointments:write",
		"billing:write",
		"audit:read",
	],
	guest: [],
};

function isRole(value: string): value is Role {
	return value === "admin" || value === "guest";
}

function readRawAuthUser(): AuthUser | null {
	const rawUser = localStorage.getItem(AUTH_USER_KEY);
	if (!rawUser) {
		return null;
	}

	try {
		const parsed = JSON.parse(rawUser) as Partial<AuthUser>;
		const username = String(parsed.username || "").trim();
		const role = String(parsed.role || "").toLowerCase();
		if (!username || !isRole(role)) {
			return null;
		}

		return { username, role };
	} catch {
		return null;
	}
}

export function readAuthSession(): AuthUser | null {
	const rawExpiry = localStorage.getItem(AUTH_EXPIRY_KEY);
	if (!rawExpiry) {
		return null;
	}

	const expiryTime = Number(rawExpiry);
	if (!Number.isFinite(expiryTime) || Date.now() >= expiryTime) {
		clearAuthSession();
		return null;
	}

	const user = readRawAuthUser();
	if (!user) {
		clearAuthSession();
		return null;
	}

	return user;
}

export function persistAuthSession(user: AuthUser): void {
	localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
	localStorage.setItem(
		AUTH_EXPIRY_KEY,
		String(Date.now() + AUTH_DURATION_MS),
	);
}

export function clearAuthSession(): void {
	localStorage.removeItem(AUTH_USER_KEY);
	localStorage.removeItem(AUTH_EXPIRY_KEY);
}

export function hasPermission(role: Role, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role].includes(permission);
}

export function getAuthHeaders(user?: AuthUser | null): HeadersInit {
	const resolvedUser = user || readAuthSession();
	if (!resolvedUser) {
		return {};
	}

	return {
		"X-CTPMS-User": resolvedUser.username,
		"X-CTPMS-Role": resolvedUser.role,
	};
}

export async function fetchWithAuth(
	input: RequestInfo | URL,
	init: RequestInit = {},
	user?: AuthUser | null,
): Promise<Response> {
	const headers = new Headers(init.headers || {});
	const authHeaders = getAuthHeaders(user);

	for (const [headerKey, headerValue] of Object.entries(authHeaders)) {
		headers.set(headerKey, headerValue);
	}

	return fetch(input, {
		...init,
		headers,
	});
}
