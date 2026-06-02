import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { Providers } from "@/components/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { DEFAULT_APP_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

const localeNames: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US",
  zh: "zh_CN",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL),
  title: "Тренажёр тестирования — Генератор тест-кейсов",
  description: "Интерактивный тренажёр для изучения методов тестирования программного обеспечения: классы эквивалентности, граничные значения и генерация тест-кейсов.",
  keywords: ["тестирование", "тест-кейсы", "эквивалентные классы", "граничные значения", "программное обеспечение"],
  authors: [{ name: "Тренажёр тестирования" }],
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TestTrainer",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "TestTrainer",
    title: "Тренажёр тестирования — Генератор тест-кейсов",
    description: "Интерактивный тренажёр для изучения методов тестирования: классы эквивалентности, граничные значения и генерация тест-кейсов.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TestTrainer — Тренажёр тестирования",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TestTrainer — Тренажёр тестирования",
    description: "Интерактивный тренажёр для изучения методов тестирования ПО.",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const htmlLang = localeNames[locale] || "ru_RU";

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Перейти к содержимому
        </a>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
