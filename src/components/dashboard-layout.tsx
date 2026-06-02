"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronDown, ChevronRight, Search, type LucideIcon, Loader2, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: DashboardNavItem[];
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
  navItems?: DashboardNavItem[];
  navGroups?: NavGroup[];
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
  navGroups,
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
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("dashboard");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      router.push("/");
    }
  }, [session, status, router, allowedRoles]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-3 text-sm text-muted-foreground">{t("loading")}</span></div>;
  }

  if (!session || !session.user.role || !allowedRoles.includes(session.user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="px-4 pt-4 pb-2 border-b">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <TitleIcon className={cn("h-5 w-5", activeColor.icon)} />
                    {title}
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-2 max-h-[calc(100vh-5rem)] overflow-y-auto">
                  <NavSidebar
                    navItems={navItems}
                    navGroups={navGroups}
                    pathname={pathname}
                    activeColor={activeColor}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Link href={backLink}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t("backToHome")}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <TitleIcon className={cn("h-5 w-5", activeColor.icon)} />
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {notifications}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-6 p-4">
        {/* Sidebar - desktop only */}
        {!isMobile && (
          <aside className="w-56 shrink-0" role="navigation" aria-label={title}>
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <NavSidebar
                navItems={navItems}
                navGroups={navGroups}
                pathname={pathname}
                activeColor={activeColor}
              />
            </div>
          </aside>
        )}

        {/* Content */}
        <main id="main-content" className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavSidebar({
  navItems,
  navGroups,
  pathname,
  activeColor,
}: {
  navItems?: DashboardNavItem[];
  navGroups?: NavGroup[];
  pathname: string;
  activeColor: ActiveColorClasses;
}) {
  const [navSearch, setNavSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const t = useTranslations("dashboard");

  const activeClass = cn(
    activeColor.bg,
    activeColor.text,
    activeColor.darkBg,
    activeColor.darkText,
    "font-medium"
  );

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (navGroups && navGroups.length > 0) {
    return (
      <>
        <div className="px-1 mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="h-7 pl-7 text-xs pr-2"
            />
          </div>
        </div>
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.label);
          const hasActive = group.items.some((item) => pathname === item.href);
          const effectiveCollapsed = isCollapsed && !hasActive;

          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{group.label}</span>
                {effectiveCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {!effectiveCollapsed && (
                <div className="space-y-0.5 ml-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const matchesSearch = navSearch
                      ? item.label.toLowerCase().includes(navSearch.toLowerCase())
                      : true;
                    if (!matchesSearch) return null;
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
              )}
            </div>
          );
        })}
      </>
    );
  }

  return (navItems || []).map((item) => {
    const isActive = pathname === item.href;
    const matchesSearch = navSearch
      ? item.label.toLowerCase().includes(navSearch.toLowerCase())
      : true;
    if (!matchesSearch) return null;
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
  });
}
