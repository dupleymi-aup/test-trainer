"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "./loading";

// Lazy load theory quiz to reduce initial bundle size
export const TheoryQuizLazy = dynamic(() => import("./theory-quiz").then((mod) => ({ default: mod.TheoryQuiz })), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
