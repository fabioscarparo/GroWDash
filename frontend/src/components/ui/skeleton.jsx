/**
 * skeleton.jsx — Shared UI primitive module.
 * Exposes reusable low-level components to keep layout and interactions consistent.
 */

import { cn } from "@/lib/utils"

/**
 * Renders the skeleton component.
 */
function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props} />
  );
}

export { Skeleton }
