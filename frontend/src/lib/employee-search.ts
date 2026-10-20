/**
 * Client-side search for the Employee Overview lists.
 * No runtime imports so node --test can load this file directly.
 */

export interface SearchableEmployee {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  department?: string | null;
}

/** True when every word of `query` appears in the name, email, role or department (any case). */
export function matchesEmployeeSearch(employee: SearchableEmployee, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [employee.name, employee.email, employee.role, employee.department]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
