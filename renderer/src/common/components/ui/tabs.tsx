import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/common/lib/utils'

type TabsVariant = 'default' | 'pill'

const TabsVariantContext = React.createContext<TabsVariant>('default')

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  'text-muted-foreground inline-flex w-fit items-center justify-center',
  {
    variants: {
      variant: {
        default: 'bg-muted h-9 rounded-lg p-[3px]',
        pill: 'h-auto rounded-full bg-zinc-200 p-1 dark:bg-zinc-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function TabsList({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const resolvedVariant: TabsVariant = variant ?? 'default'
  return (
    <TabsVariantContext.Provider value={resolvedVariant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        className={cn(
          tabsListVariants({ variant: resolvedVariant }),
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

const tabsTriggerVariants = cva(
  `data-[state=active]:bg-background dark:data-[state=active]:bg-card
  dark:data-[state=active]:text-foreground focus-visible:border-ring
  focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground
  dark:text-muted-foreground inline-flex flex-1 items-center justify-center
  gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap
  transition-[color,box-shadow] focus-visible:ring-[3px]
  focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50
  [&_svg]:pointer-events-none [&_svg]:shrink-0
  [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        default:
          'h-[calc(100%-1px)] rounded-md px-2 py-1 data-[state=active]:shadow-sm',
        pill: 'rounded-full px-3 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function TabsTrigger({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>) {
  const contextVariant = React.useContext(TabsVariantContext)
  const resolvedVariant: TabsVariant = variant ?? contextVariant
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        tabsTriggerVariants({ variant: resolvedVariant }),
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
