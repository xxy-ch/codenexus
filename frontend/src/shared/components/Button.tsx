import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-clip-padding text-[14px] font-medium whitespace-nowrap transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none select-none focus-visible:border-[#f54e00]/80 focus-visible:shadow-[0_0_0_3px_rgba(245,78,0,0.25)] focus-visible:ring-3 focus-visible:ring-[#f54e00]/50 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        outline:
          "border-border/60 bg-background/50 backdrop-blur-sm text-foreground hover:bg-white/5 hover:border-primary/25 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 dark:border-input/40 dark:bg-input/20 dark:hover:bg-input/40 dark:hover:border-primary/30",
        secondary:
          "bg-secondary/80 backdrop-blur-md border border-border/50 text-secondary-foreground hover:bg-secondary hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "hover:bg-accent/80 hover:text-accent-foreground hover:backdrop-blur-sm dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive backdrop-blur-sm hover:bg-destructive/20 hover:shadow-md focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-background/65 backdrop-blur-xl border-border/50 text-foreground shadow-lg hover:bg-background/75 hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default:
          "px-[14px] py-[10px] gap-2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "px-[8px] py-[3px] text-[12px] rounded-[6px] gap-1 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "px-[12px] py-[6px] text-[13px] rounded-[6px] gap-1.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "px-[20px] py-[14px] text-[16px] rounded-[10px] gap-2 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-[36px]",
        "icon-xs":
          "size-[24px] rounded-[6px] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-[28px] rounded-[6px] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-[44px] rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
