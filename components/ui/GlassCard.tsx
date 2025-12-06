import * as React from "react"
import { cn } from "@/lib/utils"

const GlassCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-[28px] border border-white/12 bg-white/10 p-4 sm:p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]",
            className
        )}
        {...props}
    />
))
GlassCard.displayName = "GlassCard"

export const SectionHeader = ({
    eyebrow,
    title,
    meta,
}: {
    eyebrow: string
    title: string
    meta?: React.ReactNode
}) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        </div>
        {meta && <div className="text-sm text-white/70">{meta}</div>}
    </div>
)

export { GlassCard }
export default GlassCard

