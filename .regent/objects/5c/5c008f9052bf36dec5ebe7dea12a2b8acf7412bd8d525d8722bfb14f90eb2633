"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        // Default: frosted glass pill style
        default:
          "bg-muted/60 backdrop-blur-sm border border-border/30 shadow-whisper",
        // Line: clean underline style
        line: "gap-1 bg-transparent border-0 shadow-none p-0",
        // Pills: individual pill buttons
        pills: "gap-1.5 bg-transparent border-0 shadow-none p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium whitespace-nowrap",
        "transition-all duration-200",
        // Text colors
        "text-foreground/60 hover:text-foreground",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        // Focus
        "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        // SVG
        "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Default variant active state
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=default]/tabs-list:data-active:border-border/30",
        // Line variant
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:data-active:shadow-none",
        // Line underline indicator
        "group-data-[variant=line]/tabs-list:after:absolute",
        "group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:bottom-[-5px] group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:h-0.5",
        "group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:-right-1 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:w-0.5",
        "group-data-[variant=line]/tabs-list:after:rounded-full group-data-[variant=line]/tabs-list:after:bg-primary",
        "group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:after:transition-opacity",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        // Pills variant
        "group-data-[variant=pills]/tabs-list:rounded-lg",
        "group-data-[variant=pills]/tabs-list:data-active:bg-primary",
        "group-data-[variant=pills]/tabs-list:data-active:text-primary-foreground",
        "group-data-[variant=pills]/tabs-list:data-active:shadow-sm",
        // Dark mode
        "dark:text-muted-foreground dark:hover:text-foreground",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-input",
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none",
        "animate-fade-in-up",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
