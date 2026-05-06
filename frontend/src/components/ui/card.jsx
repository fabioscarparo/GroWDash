/**
 * card.jsx — Shared UI primitive module.
 * Exposes reusable low-level components to keep layout and interactions consistent.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Renders the card component.
 */
function Card({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-[20px] bg-card py-6 text-card-foreground shadow-sm md:shadow-[0_8px_24px_rgba(0,0,0,0.04)] md:dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] border-none",
        className
      )}
      {...props} />
  );
}

/**
 * Renders the card header component.
 */
function CardHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props} />
  );
}

/**
 * Renders the card title component.
 */
function CardTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props} />
  );
}

/**
 * Renders the card description component.
 */
function CardDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props} />
  );
}

/**
 * Renders the card action component.
 */
function CardAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props} />
  );
}

/**
 * Renders the card content component.
 */
function CardContent({
  className,
  ...props
}) {
  return (<div data-slot="card-content" className={cn("px-6", className)} {...props} />);
}

/**
 * Renders the card footer component.
 */
function CardFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
