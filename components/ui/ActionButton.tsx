import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const actionButtonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary:
                    "bg-linear-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] text-white hover:shadow-[0_12px_40px_rgba(124,58,237,0.45)]",
                secondary:
                    "bg-white/10 border border-white/20 text-white hover:bg-white/15",
                ghost: "hover:bg-white/10 text-white/70 hover:text-white",
                danger: "bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 rounded-lg px-3 text-xs",
                lg: "h-12 rounded-2xl px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
)

export interface ActionButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof actionButtonVariants> {
    asChild?: boolean
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(actionButtonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
ActionButton.displayName = "ActionButton"

export { ActionButton, actionButtonVariants }
