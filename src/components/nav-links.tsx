"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "首页", exact: true },
    { href: "/posts", label: "文章", exact: false },
  ];

  return (
    <nav className="flex items-center gap-3 text-sm font-medium sm:gap-6">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
