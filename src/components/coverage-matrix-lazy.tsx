"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "./loading";

// Lazy load coverage matrix to reduce initial bundle size
export const CoverageMatrixLazy = dynamic(() => import("./coverage-matrix").then((mod) => ({ default: mod.CoverageMatrix })), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
