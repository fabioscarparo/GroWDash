/**
 * toggle.jsx — Shared UI primitive module.
 * Exposes reusable low-level components to keep layout and interactions consistent.
 */

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle-variants"

/**
 * Renders the toggle component.
 */
function Toggle({
  className,
  variant,
  size,
  ...props
}) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Toggle }
