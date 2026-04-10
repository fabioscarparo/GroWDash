/**
 * utils.js — Global functional utility helpers.
 * 
 * Provides universally applicable transformation routines, heavily skewing towards 
 * pure rendering and visual state mappings utilized across atomic Shadcn elements.
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility orchestrating the synthesis of disparate conditional Tailwind CSS token arrays 
 * resolving specificity collisions efficiently. Combines `clsx` arbitrary syntax matching 
 * with `tailwind-merge` cascade overrides.
 *
 * @function cn
 * @param {...(string|object|undefined|null|boolean)} inputs - Variadic conditional class mappings.
 * @returns {string} Calculated strict deterministic string of optimized CSS tokens.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
