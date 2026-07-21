"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { motion, useInView } from "framer-motion";
import {
  Beaker,
  Sun,
  Moon,
  Monitor,
  Target,
  Layers,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Award,
  Star,
  Languages,
  Loader2,
  Code2,
  Database,
  Palette,
  Shield,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TOTAL_TASKS = 30;
const STAR_COUNT = [0, 1, 2, 3, 4] as const;

const difficultyKeyMap: Record<string, string> = {
  "Easy": "easy",
  "Medium": "medium",
  "Hard": "hard",
};

const difficultyColor = (difficulty: string) => {
  const colorMap: Record<string, string> = {
    "Easy": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "Medium": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Hard": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return colorMap[difficulty] || colorMap["Easy"];
};

/* ─── Fade-in wrapper using framer-motion ─── */
function FadeInSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut", delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Animated counter ─── */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/* ─── Typing effect for hero ─── */
function TypedWords() {
  const t = useTranslations("landing");
  const words = t("heroTypedWords").split(",");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const typeSpeed = isDeleting ? 40 : 80;
    const pauseAtEnd = 2000;
    const pauseAtStart = 400;

    // Clear any pending pause timer
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (isPausing) {
      const timer = setTimeout(() => {
        setIsPausing(false);
        setCharIndex(1);
      }, pauseAtStart);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === currentWord.length) {
        pauseTimerRef.current = setTimeout(() => {
          pauseTimerRef.current = null;
          setIsDeleting(true);
        }, pauseAtEnd);
      } else if (isDeleting && charIndex > 0) {
        setCharIndex(charIndex - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setWordIndex((wordIndex + 1) % words.length);
        setIsPausing(true);
      }
    }, typeSpeed);

    return () => {
      clearTimeout(timer);
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };
  }, [charIndex, isDeleting, wordIndex, words, isPausing]);

  return (
    <span className="text-emerald-600 dark:text-emerald-400">
      {words[wordIndex]?.substring(0, charIndex)}
    </span>
  );
}

/* ─── Theme dropdown ─── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const currentTheme = theme || "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={t("toggleTheme")}
          suppressHydrationWarning
        >
          {currentTheme === "dark" ? <Moon className="h-4 w-4" /> : currentTheme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />{t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />{t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />{t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Language switcher ─── */
function LanguageSwitcher() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const languages = [
    { code: "ru", label: t("languageRU") },
    { code: "en", label: t("languageEN") },
    { code: "zh", label: t("languageZH") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={t("selectLanguage")}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => router.replace(pathname, { locale: lang.code })}
            className={locale === lang.code ? "bg-accent font-medium" : ""}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Header ─── */
function Header({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole: string | null }) {
  const t = useTranslations("landing");
  const tHeader = useTranslations("header");

  const roleLink = userRole === "TEACHER" ? "/teacher" : userRole === "ADMIN" ? "/admin" : "/student";
  const roleLabel = userRole === "TEACHER" ? t("teacherPanel") : userRole === "ADMIN" ? t("adminPanel") : t("myDashboard");

  return (
    <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{tHeader("appTitle")}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{tHeader("appSubtitle")}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost"><Link href={roleLink}>{roleLabel}</Link></Button>
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/trainer">{t("trainer")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost"><Link href="/login">{t("login")}</Link></Button>
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/register">{t("register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Stats pill ─── */
function UserCountStats({ count }: { count: number | null }) {
  const t = useTranslations("landing");

  if (count == null) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span className="text-muted-foreground">{t("usersLearning")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm">
        <AnimatedNumber value={count} />
        <span className="text-muted-foreground">{t("usersLearning")}</span>
      </div>
    </div>
  );
}

const methodsData = [
  { icon: Target, titleKey: "methodEquivalence" },
  { icon: Layers, titleKey: "methodBoundary" },
  { icon: Layers, titleKey: "methodCombinatorial" },
  { icon: GitBranch, titleKey: "methodDecisionTable" },
  { icon: BookOpen, titleKey: "methodStateTransition" },
  { icon: TrendingUp, titleKey: "methodPairwise" },
];

const techData = [
  { icon: Code2, titleKey: "techNextJS", descKey: "techNextJSDesc" },
  { icon: FileCode2, titleKey: "techTypeScript", descKey: "techTypeScriptDesc" },
  { icon: Database, titleKey: "techPrisma", descKey: "techPrismaDesc" },
  { icon: Palette, titleKey: "techTailwind", descKey: "techTailwindDesc" },
  { icon: Code2, titleKey: "techShadcn", descKey: "techShadcnDesc" },
  { icon: Shield, titleKey: "techNextAuth", descKey: "techNextAuthDesc" },
];

/* ═══════════════════════════════════════════════ */
/*  Main export                                    */
/* ═══════════════════════════════════════════════ */
export function LandingContent({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole: string | null }) {
  const t = useTranslations("landing");
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats", { signal: controller.signal })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setUserCount(data.userCount))
      .catch(() => { if (!controller.signal.aborted) setUserCount(null); });
    return () => controller.abort();
  }, []);

  const demoTask = useMemo(() => ({
    name: t("tryYourself"),
    difficulty: "Easy" as const,
    description: t("heroDescription"),
    topics: [t("methodEquivalence"), t("methodBoundary")],
    params: [{ name: "n", type: "number", description: "Non-negative integer" }],
    returnType: "number",
  }), [t]);

  const typedPrefix = t("heroTypedPrefix");
  const typedSuffix = t("heroTypedSuffix");

  const benefitItems = useMemo(() => [
    { icon: CheckCircle2, title: t("featureAutoCheck"), desc: t("featureAutoCheckDesc") },
    { icon: TrendingUp, title: t("featureProgress"), desc: t("featureProgressDesc") },
    { icon: Award, title: t("featureGamification"), desc: t("featureGamificationDesc") },
  ], [t]);

  const testimonialItems = useMemo(() => [
    { text: t("testimonial1Text"), name: t("testimonial1Name"), role: t("testimonial1Role"), initials: "AK" },
    { text: t("testimonial2Text"), name: t("testimonial2Name"), role: t("testimonial2Role"), initials: "DS" },
    { text: t("testimonial3Text"), name: t("testimonial3Name"), role: t("testimonial3Role"), initials: "LW" },
  ], [t]);

  const faqItems = useMemo(() => [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
    { q: t("faqQ5"), a: t("faqA5") },
    { q: t("faqQ6"), a: t("faqA6") },
  ], [t]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20 overflow-hidden">
      <Header isAuthenticated={isAuthenticated} userRole={userRole} />

      <main id="main-content" className="flex-1">

        {/* ─── Hero ─── */}
        <FadeInSection>
          <section className="relative py-20 sm:py-28">
            {/* Animated gradient orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-400/20 dark:bg-emerald-500/10 blur-3xl"
                animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-20 -right-32 w-80 h-80 rounded-full bg-teal-400/15 dark:bg-teal-500/10 blur-3xl"
                animate={{ scale: [1, 1.15, 1], x: [0, -25, 0], y: [0, 15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 text-center">
              <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5">{t("badge")}</Badge>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
                {t("heroTitle")}
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-3">
                {t("heroDescription")}
              </p>
              <p className="text-xl sm:text-2xl font-medium mb-8">
                {typedPrefix} <TypedWords /> {typedSuffix}
              </p>
              <div className="mb-6"><UserCountStats count={userCount} /></div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {isAuthenticated ? (
                  <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                    <Link href="/trainer">{t("goToTrainer")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                      <Link href="/register">{t("startLearning")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="text-base px-8">
                      <Link href="/login">{t("login")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── Key Metrics ─── */}
        <FadeInSection>
          <section className="py-12 bg-emerald-600 dark:bg-emerald-800 text-white">
            <div className="max-w-5xl mx-auto px-4">
              <h3 className="text-center text-xl sm:text-2xl font-bold mb-8">{t("metricsTitle")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold mb-1">
                    <AnimatedNumber value={TOTAL_TASKS} />+
                  </div>
                  <div className="text-sm text-emerald-100">{t("metricsTasks")}</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold mb-1">
                    {userCount != null ? <AnimatedNumber value={userCount} /> : "500"}+
                  </div>
                  <div className="text-sm text-emerald-100">{t("metricsUsers")}</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold mb-1">{methodsData.length}</div>
                  <div className="text-sm text-emerald-100">{t("metricsMethods")}</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold mb-1">24/7</div>
                  <div className="text-sm text-emerald-100">{t("metricsFeatures")}</div>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── What You'll Learn ─── */}
        <FadeInSection>
          <section className="py-16 bg-background/50">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("learnTitle")}</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("learnSubtitle")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {methodsData.map((method) => (
                  <div key={method.titleKey} className="flex items-start gap-3 p-4 rounded-lg bg-card border shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-shadow">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <method.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t(method.titleKey)}</h4>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">{t("learnRegister")}</p>
            </div>
          </section>
        </FadeInSection>

        {/* ─── Demo Task ─── */}
        <FadeInSection>
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-8">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("tryYourself")}</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("tryYourselfSubtitle")}</p>
              </div>
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{demoTask.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={difficultyColor(demoTask.difficulty)}>{t(difficultyKeyMap[demoTask.difficulty])}</Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{t("demo")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{demoTask.description}</p>
                <div className="rounded-lg bg-muted/50 p-4 text-sm font-mono">
                  <div className="text-muted-foreground mb-1">{t("functionSignature")}</div>
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400">function</span> {demoTask.name.toLowerCase()}
                    (<span className="text-blue-600 dark:text-blue-400">{demoTask.params[0].name}</span>: <span className="text-yellow-600 dark:text-yellow-400">{demoTask.params[0].type}</span>): <span className="text-yellow-600 dark:text-yellow-400">{demoTask.returnType}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {demoTask.topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">{topic}</Badge>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-3">{t("seeMoreRegister")}</p>
                  <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/register">{t("startFree")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── How It Works ─── */}
        <FadeInSection>
          <section className="py-16 bg-background/50">
            <div className="max-w-5xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("howItWorks")}</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("howItWorksSubtitle")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold mx-auto mb-4">{n}</div>
                    <h4 className="text-lg font-semibold mb-2">{t(`step${n}Title`)}</h4>
                    <p className="text-sm text-muted-foreground">{t(`step${n}Desc`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── Benefits ─── */}
        <FadeInSection>
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("featuresTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {benefitItems.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <f.icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold mb-2">{f.title}</h4>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── Testimonials ─── */}
        <FadeInSection>
          <section className="py-16 bg-background/50">
            <div className="max-w-5xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("testimonialsTitle")}</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("testimonialsSubtitle")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonialItems.map((item, i) => (
                  <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex gap-1 mb-3">
                      {STAR_COUNT.map((s) => (
                        <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{item.text}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {item.initials}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── Tech Stack ─── */}
        <FadeInSection>
          <section className="py-16">
            <div className="max-w-5xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("techTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {techData.map((tech) => (
                  <div key={tech.titleKey} className="flex items-start gap-3 p-4 rounded-lg bg-card border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <tech.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t(tech.titleKey)}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(tech.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ─── FAQ (shadcn Accordion) ─── */}
        <FadeInSection>
          <section className="py-16 bg-background/50">
            <div className="max-w-3xl mx-auto px-4">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("faqTitle")}</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("faqSubtitle")}</p>
              </div>
              <Accordion type="single" collapsible className="space-y-3">
                {faqItems.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="rounded-lg border bg-card px-4 data-[state=open]:border-emerald-200 dark:data-[state=open]:border-emerald-800">
                    <AccordionTrigger className="text-sm font-medium">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </FadeInSection>

        {/* ─── CTA ─── */}
        {isAuthenticated ? (
          <FadeInSection>
            <section className="py-16">
              <div className="max-w-3xl mx-auto px-4 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  {userRole === "TEACHER" ? t("teacherPanel") : userRole === "ADMIN" ? t("adminPanel") : t("continueLearning")}
                </h3>
                <p className="text-muted-foreground mb-8">
                  {userRole === "TEACHER" ? t("teacherManageDesc") : userRole === "ADMIN" ? t("adminManageDesc") : t("studentDashboardDesc")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild size="lg" variant="outline" className="text-base px-8">
                    <Link href={userRole === "TEACHER" ? "/teacher" : userRole === "ADMIN" ? "/admin" : "/student"}>
                      {userRole === "TEACHER" ? t("teacherPanel") : userRole === "ADMIN" ? t("adminPanel") : t("myDashboard")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                    <Link href="/trainer">{t("trainer")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </section>
          </FadeInSection>
        ) : (
          <FadeInSection>
            <section className="py-16">
              <div className="max-w-3xl mx-auto px-4 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{t("readyToStart")}</h3>
                <p className="text-muted-foreground mb-8">{t("readyToStartDesc", { total: TOTAL_TASKS })}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                    <Link href="/register">{t("signUp")}</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-base px-8">
                    <Link href="/login">{t("signInAccount")}</Link>
                  </Button>
                </div>
              </div>
            </section>
          </FadeInSection>
        )}
      </main>

      <footer className="border-t bg-background/50">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          {t("footer")}
        </div>
      </footer>
    </div>
  );
}
