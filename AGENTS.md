# Agent patterns for test-trainer

## ESLint

- **`react-hooks/exhaustive-deps` missing `t` dependency**: `t` from `useTranslations()` (next-intl) is stable. Add `// eslint-disable-next-line react-hooks/exhaustive-deps` instead of listing it.

- **`no-explicit-any`**: Prefer proper union types over `any`. For test mocks use typed nullable fields (e.g. `mockResult: SomeType | null`), then assign in `beforeEach`. Avoid `as any` in mock initializers.

## TypeScript

- **Union type cast fails on Prisma delegates**: Use `as unknown as TargetType` instead of direct `as TargetType`.

- **`model.findMany({})` returns a union type**: Cast via `as unknown as { findMany: (args: Record<string, unknown>) => Promise<unknown[]> }`.

## Testing

- **Route tests**: Mock prisma with `vi.hoisted()`; use `make*Request()` helpers for GET/POST/PATCH/DELETE; test auth, CSRF, validation, pagination, error paths.

- **Lib tests under `node` environment**: SSR-safe modules using `typeof window` need `globalThis.window` defined before import.
