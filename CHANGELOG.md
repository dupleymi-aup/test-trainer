# Changelog

All notable changes to TestTrainer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added 5 unit tests for `useFetch` hook: `onSuccess` callback, `onError` callback, `invalidateFetchCache` with pattern matching and void return
- Added 10 unit tests for `safeJsonParse` utility function covering edge cases

### Fixed
- Translated JSDoc comments in `storage.ts` to English (15 comments)
- Updated AppError JSDoc usage example to English
- Translated error-boundary component text to English ("Something went wrong", "Try again", "Reload page")
- Translated loading component text and aria-labels to English ("Loading...")
- Translated password-strength-indicator labels to English ("Weak", "Fair", "Good", "Strong", check labels)
- Standardized Zod validation error format across 11 API routes to use `formatZodError()` instead of raw `parsed.error.issues`
- Replaced Russian-language Zod validation messages with English in teacher/groups, teacher/announcements, teacher/task-constructor, teacher/templates, admin/users, admin/deadlines routes
- Replaced Russian error messages with English in auth/reset-password route
- Updated subpage-error component to display English error messages
- Updated keyboard-shortcuts component to display English shortcut descriptions
- Updated subpage-loading component to display English loading text

### Changed
- Replaced duplicate `safeJsonParse` definitions in teacher/templates/[id] and teacher/task-constructor routes with shared import from `src/lib/utils.ts`

## [0.2.0] — 2025-05-21

### Added
- Admin analytics expansion: new reports, charts, executive dashboard, forecasting
- 5 new analytics reports with in-memory caching
- Task detail, student comparison, and performance dashboard reports
- 130 unit tests with CI pipeline for unit testing (Vitest)
- Deadline & reminder system with admin alerts and student notifications
- Teacher & admin dashboards: analytics, reports, notifications, export utilities
- Risk analysis, group performance, completion matrix, compare periods, student report cards
- Command palette, Zustand store, export utilities
- PWA manifest and offline mode
- i18n support (RU/EN via next-intl)
- Marathon mode persistence
- Markdown notes, global notes, new task content
- "Clear all" button, test case list in exam mode
- Attempt timeline, "compare with best" feature
- Task notes, Fill BV/Fill EC auto-fill
- Achievement system (9 badges)
- Drag & Drop test case reordering
- Undo/Redo history
- Progress export/import (JSON)
- Achievement export as shareable image

### Fixed
- Corrected educational content in tasks — EC examples, BMI boundaries, price specs
- Replaced insecure `Math.random()` OTP with cryptographic `generateSecureOTP()`
- Fixed race condition in exam timer
- Fixed TypeScript errors, removed .next from repository
- Fixed build issues, code highlighting, CSV export, state management

### Security
- Security hardening: CSRF protection, error handling, input validation
- Replaced insecure base64 tokens with cryptographically random tokens
- Added middleware for route protection
- Fixed authentication bugs

### Performance
- Added in-memory caching to all 21 analytics API routes
- Cross-platform build scripts
- React Strict Mode enabled

### Testing
- 17 unit test files covering utils, CSRF, reminder-templates, storage, evaluator, crypto, undo-stack, risk-analysis, analytics-cache, analytics-queries
- API route tests for auth and admin users
- 5 Playwright E2E specs: auth, core-app, security, homepage, trainer

### Changed
- Downgraded Next.js to v15 for stability
- Refactored page logic into custom hooks and components
- Updated README, license, and Next.js configuration

## [0.1.0] — Initial Release

### Added
- Basic tasks for equivalence classes and boundary values (17 tasks total)
- EC/BV coverage evaluation system
- Exam mode and practice mode with hints
- Full authentication (registration, login, password recovery, email verification)
- User profile
- Multi-role system (Student, Teacher, Admin)
- Group management and permissions
- Next.js 15 App Router architecture
- Tailwind CSS 4 + shadcn/ui components
- SQLite via Prisma ORM
- Zustand state management
- Framer Motion animations
