import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ru", "en", "zh"],
  defaultLocale: "ru",
  localePrefix: "as-needed", // No prefix for default locale
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
