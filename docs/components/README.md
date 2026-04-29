# Component Documentation

CodeNexus UI component library built with React, Tailwind CSS v4, CVA, and shadcn/base-ui primitives.

## Design System

All components follow the **Linear-style frosted glass** aesthetic:
- Rounded corners (`rounded-lg` / `rounded-xl`)
- Layered shadows (`shadow-whisper`, `shadow-card`, `shadow-elevated`, `shadow-prominent`, `shadow-overlay`)
- Semi-transparent backgrounds with `backdrop-blur` for glass variants
- Smooth transitions (`duration-200`, `ease-[cubic-bezier(0.4,0,0.2,1)]`)
- Dark mode via CSS custom properties (`.dark` class on `<html>`)

### Design Tokens

All tokens are defined in `frontend/src/index.css` using `@theme inline`. Key categories:

| Category | Examples |
|----------|---------|
| Colors | `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive` |
| Surfaces | `--card`, `--popover`, `--background` |
| Shadows | `--shadow-whisper`, `--shadow-card`, `--shadow-elevated`, `--shadow-prominent`, `--shadow-overlay` |
| Glass | `--glass-bg`, `--glass-border`, `--glass-blur` |
| Status | `--status-accepted`, `--status-pending`, `--status-tle`, `--status-re` |
| Difficulty | `--difficulty-easy`, `--difficulty-medium`, `--difficulty-hard` |

---

## Components

### Button

```tsx
import { Button } from '@/components/ui/Button'

// Variants: default, outline, secondary, ghost, destructive, link, glass
<Button variant="default">Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="glass">Glass Effect</Button>
<Button disabled>Loading...</Button>
```

**Props:** `variant`, `size`, `className`, standard button props via `@base-ui/react/button`.

**Sizes:** `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.

---

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

// Variants: default, glass, elevated, outlined
<Card variant="glass">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>Body content</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

**Props:** `variant`, `size` (`default` | `sm`), `className`, standard div props.

---

### Input

```tsx
import { Input } from '@/components/ui/Input'

// Variants: default, glass
<Input placeholder="Enter username" />
<Input variant="glass" placeholder="Search..." />
<Input error="This field is required" />
<Input disabled placeholder="Disabled" />
```

**Props:** `variant`, `error`, `fullWidth`, `className`, standard input props.

---

### Select

```tsx
import { Select } from '@/components/ui/Select'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

<Select options={options} value={value} onValueChange={setValue} />
<Select options={options} variant="glass" placeholder="Choose..." />
<Select options={options} error="Required" />
```

**Props:** `options`, `value`, `onValueChange`, `placeholder`, `error`, `variant`, `fullWidth`, `disabled`.

---

### Checkbox

```tsx
import { Checkbox } from '@/components/ui/Checkbox'

<Checkbox checked={checked} onCheckedChange={setChecked} />
<Checkbox label="Accept terms" />
<Checkbox checked="indeterminate" /> {/* Indeterminate state */}
<Checkbox disabled label="Locked" />
<Checkbox error="Required" />
```

**Props:** `checked` (`boolean | 'indeterminate'`), `onCheckedChange`, `label`, `error`, `disabled`.

---

### RadioGroup

```tsx
import { RadioGroup } from '@/components/ui/Radio'

const options = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

<RadioGroup options={options} value={value} onValueChange={setValue} />
<RadioGroup options={options} orientation="horizontal" />
<RadioGroup options={options} error="Pick one" />
```

**Props:** `options`, `value`, `onValueChange`, `name`, `error`, `orientation` (`vertical` | `horizontal`).

---

### Switch

```tsx
import { Switch } from '@/components/ui/Switch'

<Switch checked={on} onCheckedChange={setOn} />
<Switch label="Dark mode" checked={dark} onCheckedChange={setDark} />
<Switch disabled label="Locked" />
<Switch error="Must enable" />
```

**Props:** `checked`, `onCheckedChange`, `label`, `error`, `disabled`.

---

### Textarea

```tsx
import { Textarea } from '@/components/ui/Textarea'

// Variants: default, glass
<Textarea placeholder="Write your solution..." />
<Textarea variant="glass" placeholder="Comments..." />
<Textarea error="Too short" />
<Textarea disabled placeholder="Read only" />
```

**Props:** `variant`, `error`, `fullWidth`, `className`, standard textarea props.

---

### Tooltip

```tsx
import { Tooltip } from '@/components/ui/Tooltip'

// Sides: top, right, bottom, left
<Tooltip content="Helpful hint" side="top">
  <button>Hover me</button>
</Tooltip>
<Tooltip content="Info" delay={500} side="bottom">
  <span>Delayed tooltip</span>
</Tooltip>
```

**Props:** `content`, `children`, `side`, `delay` (ms), `className`.

---

### Badge

```tsx
import { Badge } from '@/components/ui/badge'

// Variants: default, secondary, destructive, outline, ghost, link,
//           success, warning, info, easy, medium, hard
<Badge>Default</Badge>
<Badge variant="success">Accepted</Badge>
<Badge variant="hard">Hard</Badge>
<Badge variant="outline">Tag</Badge>
```

**Props:** `variant`, `className`, standard span props.

---

### StatusBadge

```tsx
import { StatusBadge } from '@/components/ui/StatusBadge'

// Statuses: accepted, wrong_answer, time_limit_exceeded,
//           memory_limit_exceeded, compilation_error, runtime_error,
//           pending, running
<StatusBadge status="accepted" />
<StatusBadge status="running" />  {/* Animated pulse */}
<StatusBadge status="pending" />  {/* Animated pulse */}
```

**Props:** `status`, `className`.

---

### Dialog

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Glass overlay with `backdrop-blur-sm`, glass content panel with `backdrop-blur-xl`.

---

### DropdownMenu

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Glass popup with `backdrop-blur-xl` and rounded items.

---

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Variants: default, line, pills
<Tabs defaultValue="account">
  <TabsList variant="pills">
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account settings</TabsContent>
  <TabsContent value="security">Security settings</TabsContent>
</Tabs>
```

---

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Problem A</TableCell>
      <TableCell><StatusBadge status="accepted" /></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

Rounded container with glass background and subtle hover states.

---

### Toast

Uses `react-hot-toast` under the hood with custom glass styling.

```tsx
import toast from 'react-hot-toast'

toast.success('Saved!')
toast.error('Failed to save')
```

Glass panel with accent borders per type and `backdrop-blur-xl`.

---

## Conventions

### Import Paths

```tsx
// PascalCase files (custom components)
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'        // lowercase (shadcn convention)
import { Dialog } from '@/components/ui/dialog'       // lowercase (shadcn convention)
import { Table } from '@/components/ui/table'         // lowercase (shadcn convention)
```

### Styling

- Use `cn()` from `@/lib/utils` for conditional class merging
- Prefer design tokens over hardcoded colors
- Use `data-slot` attributes for CSS targeting
- All transitions use `duration-200` with `ease-[cubic-bezier(0.4,0,0.2,1)]`

### Glass Effect Tiers

| Tier | Usage | Classes |
|------|-------|---------|
| Subtle | Small UI elements | `bg-background/40 backdrop-blur-sm` |
| Standard | Cards, panels | `bg-background/60 backdrop-blur-xl` |
| Prominent | Overlays, modals | `bg-background/80 backdrop-blur-xl` |
