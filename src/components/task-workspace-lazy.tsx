"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "./loading";

// Lazy load task workspace to reduce initial bundle size
// SyntaxHighlighter adds ~200KB to the bundle
export const TaskWorkspaceLazy = dynamic(() => import("./task-workspace").then((mod) => ({ default: mod.TaskWorkspace })), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
