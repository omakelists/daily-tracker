/**
 * Tiny className combiner — drop-in replacement for emotion's cx().
 * Filters out falsy values and joins with a space.
 */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}
