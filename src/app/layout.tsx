import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_SC } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
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

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const localeNames: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US",
  zh: "zh_CN",
};

const metadataByLocale: Record<string, { title: string; description: string; keywords: string }> = {
  ru: {
    title: "Тренажёр тестирования — Генератор тест-кейсов",
    description: "Интерактивный тренажёр для изучения методов тестирования программного обеспечения: классы эквивалентности, граничные значения и генерация тест-кейсов.",
    keywords: "тестирование, тест-кейсы, эквивалентные классы, граничные значения, программное обеспечение",
  },
  en: {
    title: "Test Trainer — Test Case Generator",
    description: "Interactive trainer for learning software testing methods: equivalence classes, boundary values, and test case generation.",
    keywords: "testing, test cases, equivalence classes, boundary values, software",
  },
  zh: {
    title: "测试训练器 — 测试用例生成器",
    description: "用于学习软件测试方法的交互式训练器：等价类、边界值和测试用例生成。",
    keywords: "测试, 测试用例, 等价类, 边界值, 软件",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const meta = metadataByLocale[locale] || metadataByLocale.ru;
  const url = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  return {
    metadataBase: new URL(url),
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords.split(", "),
    authors: [{ name: "TestTrainer" }],
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
      locale: localeNames[locale],
      siteName: "TestTrainer",
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "TestTrainer",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "TestTrainer",
      description: meta.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getTranslations("header");

  const fontClass = locale === "zh"
    ? `${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} font-[var(--font-noto-sans-sc)]`
    : `${geistSans.variable} ${geistMono.variable}`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontClass} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {t("skipToContent")}
        </a>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
