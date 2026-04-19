import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    let classes = "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 active:scale-95 "
    
    if (variant === "default") classes += "bg-brand text-black hover:bg-brand-hover "
    if (variant === "outline") classes += "border border-border bg-surface hover:bg-surface-hover text-foreground "
    if (variant === "ghost") classes += "hover:bg-surface hover:text-foreground "
    
    if (size === "default") classes += "h-12 px-6 rounded-full "
    if (size === "sm") classes += "h-9 px-3 text-sm rounded-lg "
    if (size === "lg") classes += "h-14 px-8 text-lg font-semibold rounded-full "
    
    return (
      <button
        className={`${classes} ${className || ""}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
