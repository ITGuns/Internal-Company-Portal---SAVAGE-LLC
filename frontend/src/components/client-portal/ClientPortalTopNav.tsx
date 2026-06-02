"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT_PORTAL_NAV_ITEMS } from "@/lib/client-portal-navigation";
import { cn } from "@/lib/utils";

function isClientPortalNavItemActive(href: string, pathname: string): boolean {
  if (href === "/client") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ClientPortalTopNav({ className }: { className?: string }) {
  const pathname = usePathname() || "/client";

  return (
    <nav
      aria-label="Client portal sections"
      className={cn(
        "mt-4 border-y border-[var(--border)] bg-[var(--surface-raised)]/70 px-2 py-2 shadow-[0_18px_42px_-38px_var(--accent)] backdrop-blur",
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CLIENT_PORTAL_NAV_ITEMS.map((item) => {
          const isActive = isClientPortalNavItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border px-3 text-xs font-semibold",
                "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_24px_-16px_var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
