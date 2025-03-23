import { cn } from "@/lib/utils"

export function Spinner({ className }: { className?: string }) {
    return (
        <div className={cn("animate-spin rounded-full border-4 border-t-transparent border-gray-300 h-6 w-6", className)} />
    )
}
export function LoadingOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full border-4 border-t-transparent border-white h-10 w-10" />
        </div>
    )
}
