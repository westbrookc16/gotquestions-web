import { cn } from "@/lib/utils"

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("animate-spin rounded-full border-4 border-t-transparent border-gray-300 h-6 w-6", className)} />
  )
}
