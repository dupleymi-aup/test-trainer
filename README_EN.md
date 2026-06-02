<div align="center">

# TestTrainer v4.0

### Interactive Platform for Software Testing Practice

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-new--york-black)](https://ui.shadcn.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)](https://www.prisma.io/)
[![Recharts](https://img.shields.io/badge/Recharts-2-ff7300)](https://recharts.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

**Author:** Dupley Maxim Igorevich

**Intellectual Property:** Dupley Maxim Igorevich

[🇷🇺 Русская версия](./README_RU.md)

</div>

---

## About the Project

**TestTrainer** is a comprehensive web platform for interactive study of software testing methodologies. The project is designed as a full-featured educational application that combines tasks for equivalence classes, boundary value analysis, a testing system with exam mode, gamification with XP progression, and an achievement system. The platform is intended for IT students, QA engineers, and anyone who wants to master black-box testing methods through practical exercises.

The project supports user authentication, progress persistence in a database, result export, and an adaptive interface for all devices.

## Key Features

- **17 interactive tasks** — from factorial to login lockout, each with equivalence classes and boundary values
- **Coverage evaluation system** — automatic calculation of equivalence class (EC) and boundary value (BV) coverage
- **Exam mode** — random task generation with time limits
- **Practice mode** — free task progression with hints
- **Attempt timeline** — visual history of all attempts with scores and dates
- **Compare with best** — highlighting progress relative to the best attempt
- **Fill BV / Fill EC** — auto-fill test cases for boundary values and equivalence classes
- **Notes** — personal notes for each task
- **Achievement system** — badges for progress: from first test to perfectionist
- **Drag & Drop** — reorder test cases by dragging
- **Undo/Redo** — change history with rollback capability
- **Progress export** — save and load progress via JSON file
- **Authentication** — registration, login, password recovery, email verification
- **Dark and light themes** with automatic detection of system preferences
- **Adaptive interface** — fully responsive design for mobile devices, tablets, and desktops

## Platform Tasks

| # | Task | Difficulty | Description |
|---|------|------------|-------------|
| 1 | **Factorial** | Easy | Computes factorial of a non-negative integer. Overflow checks, negative values, non-numeric types |
| 2 | **Prime Number** | Medium | Checks if an integer is prime. Boundary values, large numbers, non-linear equivalence classes |
| 3 | **Discount Calculator** | Medium | Applies a discount to a price. Multi-factor testing: price + discount percentage |
| 4 | **Leap Year** | Easy | Checks if a year is leap by divisibility rules for 4, 100, and 400 |
| 5 | **Triangle** | Medium | Determines triangle type by three sides: equilateral, isosceles, scalene, not a triangle |
| 6 | **Password Validation** | Hard | Validates password against criteria: length ≥ 8, uppercase, lowercase, digits, special characters |
| 7 | **Palindrome** | Easy | Determines if a string is a palindrome. Supports Cyrillic, spaces, punctuation |
| 8 | **Email Validation** | Hard | Validates email address: format, domain, TLD, allowed characters |
| 9 | **Roman Numerals** | Medium | Converts an integer to Roman numerals (1–3999) |
| 10 | **Date Validation** | Hard | Validates a date: day, month, year, leap years, days per month |
| 11 | **Phone Validation** | Hard | Validates phone number: format, country code, length, allowed characters |
| 12 | **BMI Calculator** | Medium | Calculates Body Mass Index. Multi-factor: weight + height, underweight/normal/overweight |
| 13 | **Number Parsing** | Hard | Parses a string into a number. Handles decimals, signs, scientific notation, invalid input |
| 14 | **Array Flattening** | Hard | Flattens a nested array to a specified depth. Recursive structures, empty arrays |
| 15 | **Fibonacci** | Medium | Computes the nth Fibonacci number. Negative indices, large numbers, overflow |
| 16 | **Shipping Cost** | Hard | Decision table testing: weight + distance + speed → shipping cost calculation |
| 17 | **Login Lockout** | Hard | State transition testing: failed attempts, lockout timer, reset, account blocking |

## Multi-Role System

| Role | Capabilities |
|------|-------------|
| **Student** | Complete tasks, track progress, view achievements, participate in groups |
| **Teacher** | Manage students and groups, view analytics, export reports |
| **Admin** | Full user management, system settings, activity logs, database health |

## Evaluation System

The platform automatically evaluates each set of test cases on three metrics:

| Metric | Description |
|--------|-------------|
| **EC Coverage** | Percentage of equivalence classes covered |
| **BV Coverage** | Percentage of boundary values covered |
| **Correctness** | Percentage of correctly classified results |
| **Overall Score** | Weighted average: EC × 40% + BV × 30% + Correctness × 30% |

## Achievements

| Achievement | Description |
|-------------|-------------|
| 🎯 **First Test** | Submit your first test case check |
| 💯 **Flawless** | Score 100% on any task |
| ⭐ **Halfway** | Complete half of all tasks |
| 🏆 **Testing Master** | Complete all tasks |
| 👑 **Perfectionist** | Score 100% on all tasks |
| 🔥 **Streak** | Complete 3 tasks in a row without errors |
| 📊 **Analyst** | BV coverage ≥ 80% on any task |
| 🧪 **Researcher** | EC coverage ≥ 80% on any task |
| 🎓 **Examiner** | Pass an exam with score ≥ 80% |

## Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15 | React framework with App Router, SSR, and optimization |
| **TypeScript** | 5 | Static typing for code reliability |
| **Tailwind CSS** | 4 | Utility-first CSS for rapid UI development |
| **shadcn/ui** | — | UI components in New York style |
| **Prisma** | 6 | ORM for SQLite database |
| **Recharts** | 2 | Interactive charts and data visualization |
| **Zustand** | 5 | Lightweight state management with persistence |
| **Framer Motion** | 12 | Smooth animations and transitions |
| **next-auth** | 4 | Authentication: email/password, OAuth, sessions |
| **next-themes** | — | Dark/light theme switching |
| **@dnd-kit** | 6 | Drag & Drop for test case reordering |
| **Lucide React** | — | Icon set for the interface |
| **Radix UI** | — | Accessible UI component primitives |
| **React Syntax Highlighter** | 15 | Code syntax highlighting |

## Installation and Setup

### Prerequisites

- **Node.js** version 18 or higher (20+ recommended)
- **npm**, **yarn**, **pnpm**, or **bun** as package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/QuadDarv1ne/test-trainer.git
cd test-trainer

# Install dependencies
npm install

# Initialize the database
npx prisma db push

# Run in development mode
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build the project
npm run build

# Run the built application
npm start
```

### Database Management

```bash
# Push schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Create a migration
npm run db:migrate

# Reset the database
npm run db:reset
```

## Project Structure

```
test-trainer/
├── prisma/
│   └── schema.prisma           # Prisma schema (User, Account, Session, VerificationToken)
├── public/                     # Static files
│   ├── logo.svg                # Project logo
│   └── favicon.svg             # Favicon
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with ThemeProvider and AuthProvider
│   │   ├── page.tsx            # Main page (SPA with tabs)
│   │   ├── globals.css         # Global styles and CSS variables
│   │   ├── (auth)/             # Authentication routes
│   │   │   ├── login/          # Login page
│   │   │   ├── register/       # Registration page
│   │   │   ├── forgot-password/# Password recovery
│   │   │   ├── reset-password/ # Password reset
│   │   │   └── verify-email/   # Email verification
│   │   ├── profile/            # User profile page
│   │   └── api/                # API routes
│   │       ├── auth/           # NextAuth endpoints
│   │       ├── auth/register/  # Registration
│   │       ├── auth/forgot-password/
│   │       ├── auth/reset-password/
│   │       ├── auth/verify-email/
│   │       └── auth/verify-otp/
│   ├── components/
│   │   ├── ui/                 # 60+ shadcn/ui components
│   │   ├── app-header.tsx      # Application header
│   │   ├── auth-provider.tsx   # NextAuth SessionProvider
│   │   ├── user-menu.tsx       # User menu
│   │   ├── test-form.tsx       # Test case form
│   │   ├── task-card.tsx       # Task card
│   │   ├── task-workspace.tsx  # Task workspace
│   │   ├── trainer-tab.tsx     # Trainer tab
│   │   ├── exam-mode.tsx       # Exam mode
│   │   ├── task-list-tab.tsx   # Task list tab
│   │   ├── progress-stats-bar.tsx # Statistics bar
│   │   ├── achievements-panel.tsx # Achievements panel
│   │   ├── statistics-panel.tsx   # Statistics panel
│   │   ├── results-panel.tsx      # Results panel
│   │   ├── confetti.tsx           # Confetti animation
│   │   ├── onboarding.tsx         # Onboarding for new users
│   │   └── keyboard-shortcuts.tsx # Keyboard shortcuts
│   ├── hooks/
│   │   ├── use-trainer-state.ts # Main trainer state hook
│   │   ├── use-mobile.ts        # Mobile device detection
│   │   └── use-toast.ts         # Toast notifications hook
│   └── lib/
│       ├── tasks.ts             # Task definitions (EC, BV, reference functions)
│       ├── evaluator.ts         # Test case evaluation system
│       ├── achievements.ts      # Achievement system
│       ├── storage.ts           # Progress storage (localStorage)
│       ├── undo-stack.ts        # Undo/Redo stack
│       ├── constants.ts         # Application constants
│       ├── db.ts                # Prisma client
│       ├── email.ts             # Email service
│       ├── sms.ts               # SMS service
│       └── auth.ts              # Authentication utilities
├── package.json                 # Dependencies and scripts
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── Caddyfile                    # Caddy configuration (reverse proxy)
├── README_RU.md                 # Documentation (Russian)
├── README_EN.md                 # Documentation (English)
├── LICENSE                      # License (bilingual)
└── .gitignore                   # Git exclusions
```

## Roadmap

- [x] Basic tasks for equivalence classes and boundary values
- [x] EC/BV coverage evaluation system
- [x] Exam mode
- [x] Practice mode with hints
- [x] Attempt timeline and compare with best
- [x] Task notes
- [x] Fill BV / Fill EC — auto-fill test cases
- [x] Achievement system
- [x] Drag & Drop test cases
- [x] Undo/Redo
- [x] Progress export/import
- [x] Authentication (registration, login, password recovery)
- [x] User profile
- [x] Multi-role system (Student, Teacher, Admin)
- [x] Group management and permissions
- [x] Teacher analytics and reports
- [x] Admin panel (user management, activity logs, system settings)
- [x] E2E tests (Playwright)
- [x] PWA manifest and offline mode
- [x] Full multilingual support (EN/RU with next-intl)
- [ ] Demo/guest mode without authentication
- [ ] PostgreSQL support
- [ ] API documentation (OpenAPI/Swagger)
- [ ] CI/CD auto-deploy (Vercel, Railway)
- [ ] Error tracking (Sentry)
- [ ] Accessibility audit (WCAG 2.1)

---

## 👤 Author

**Dupley Maxim Igorevich**

This project is the intellectual property of Dupley Maxim Igorevich. All rights to the source code, design, content, and educational materials belong to the author.

---

## 📄 License

This project is the intellectual property of Dupley Maxim Igorevich. Terms of use are described in the [LICENSE](./LICENSE) file.

---

<div align="center">

**TestTrainer v4.0** — © 2025–2026 Dupley Maxim Igorevich

</div>
