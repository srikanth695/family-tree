import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const buttonVariants = {
  default: "bg-stone-900 text-stone-50 hover:bg-stone-800",
  outline: "border border-stone-200 bg-transparent hover:bg-stone-100 text-stone-900",
  ghost: "hover:bg-stone-100 text-stone-900",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
}

const sizeVariants = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant as keyof typeof buttonVariants],
          sizeVariants[size as keyof typeof sizeVariants],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
