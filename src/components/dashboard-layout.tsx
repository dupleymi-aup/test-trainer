"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface ActiveColorClasses {
  /** Background for active item in light mode, e.g. "bg-amber-100" */
  bg: string;
  /** Text color for active item, e.g. "text-amber-800" */
  text: string;
  /** Dark mode background, e.g. "dark:bg-amber-900/30" */
  darkBg: string;
  /** Dark mode text, e.g. "dark:text-amber-400" */
  darkText: string;
  /** Header icon color, e.g. "text-amber-600" */
  icon: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: DashboardNavItem[];
  /** Role(s) required to access the dashboard */
  allowedRoles: string[];
  /** Dashboard title shown in the header */
  title: string;
  /** Icon shown next to the title */
  titleIcon: LucideIcon;
  /** Color theme for active nav items */
  activeColor: ActiveColorClasses;
  /** Back link destination */
  backLink?: string;
  /** Optional notifications bell component */
  notifications?: ReactNode;
}

export function DashboardLayout({
  children,
  navItems,
  allowedRoles,
  title,
  titleIcon: TitleIcon,
  activeColor,
  backLink = "/",
  notifications,
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!allowedRoles.includes(session.user.role)) {
      router.push("/");
    }
  }, [session, status, router, allowedRoles]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  if (!session || !allowedRoles.includes(session.user.role)) {
    return null;
  }

  const activeClass = cn(
    activeColor.bg,
    activeColor.text,
    activeColor.darkBg,
    activeColor.darkText,
    "font-medium"
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={backLink}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              На главную
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-4">
            <TitleIcon className={cn("h-5 w-5", activeColor.icon)} />
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {notifications}
            <span className="text-sm text-muted-foreground">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-6 p-4">
        {/* Sidebar */}
        <nav className="w-56 shrink-0" role="navigation" aria-label={title}>
          <div className="space-y-1 sticky top-20">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? activeClass
                      : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main id="main-content" className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
