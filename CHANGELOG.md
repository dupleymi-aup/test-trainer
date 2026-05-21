# Changelog

All notable changes to TestTrainer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Removed stray `"2"` dependency from package.json that caused npm resolution issues on Windows
- Removed unused `twilio` from `serverExternalPackages` in next.config.ts
- Removed `ignoreBuildErrors: true` workaround — builds now fail fast on TypeScript errors
- Added missing React imports to progress-stats-bar, task-card, and results-panel components
- Replaced non-existent Timeline icon with Route icon in admin navigation

### Added
- Expanded i18n translations from ~38 to 120+ keys covering navigation, trainer, auth, progress, onboarding, achievements, and UI components
- Comprehensive CHANGELOG.md

### Changed
- Cleaned up next.config.ts by removing Windows/WSL-specific workarounds

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
