import { FormEvent, useState } from "react";

interface LoginProps {
	onLogin: (username: string, password: string) => void;
	isLoading?: boolean;
	error?: string;
}

export default function Login({
	onLogin,
	isLoading = false,
	error,
}: LoginProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onLogin(username, password);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900">CTPMS</h1>
					<p className="text-gray-600 mt-2">
						Clinical Trial Patient Management System
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label
							htmlFor="username"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Username
						</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="Enter your username"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
							disabled={isLoading}
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Enter your password"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
							disabled={isLoading}
						/>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={isLoading || !username || !password}
						className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
					>
						{isLoading ? "Logging in..." : "Login"}
					</button>
				</form>
			</div>
		</div>
	);
}
