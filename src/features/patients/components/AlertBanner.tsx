interface AlertBannerProps {
	tone: "success" | "error" | "warning";
	message: string;
}

const toneClasses: Record<AlertBannerProps["tone"], string> = {
	success: "border-emerald-300 bg-emerald-50 text-emerald-700",
	error: "border-red-300 bg-red-50 text-red-700",
	warning: "border-amber-300 bg-amber-50 text-amber-800",
};

export default function AlertBanner({ tone, message }: AlertBannerProps) {
	return (
		<div
			className={`rounded-xl border px-4 py-3 text-sm ${toneClasses[tone]}`}
		>
			{message}
		</div>
	);
}
