"use client";

import { Check, X } from "lucide-react";

interface PasswordStrengthResult {
  score: number;
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const checks = [
    { label: "Минимум 8 символов", passed: password.length >= 8 },
    { label: "Заглавная буква", passed: /[A-ZА-ЯЁ]/.test(password) },
    { label: "Цифра", passed: /\d/.test(password) },
    { label: "Спецсимвол", passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  if (password.length === 0) {
    return { score: 0, label: "", color: "", checks };
  }

  if (passedCount <= 1) {
    return { score: 1, label: "Слабый", color: "text-red-500", checks };
  }
  if (passedCount === 2) {
    return { score: 2, label: "Средний", color: "text-orange-500", checks };
  }
  if (passedCount === 3) {
    return { score: 3, label: "Хороший", color: "text-yellow-500", checks };
  }
  return { score: 4, label: "Надёжный", color: "text-emerald-500", checks };
}

const barColorMap: Record<number, string> = {
  0: "bg-transparent",
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-emerald-500",
};

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, color, checks } = getPasswordStrength(password);

  if (score === 0) return null;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? barColorMap[score] : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Label */}
      {label && <p className={`text-xs font-medium ${color}`}>{label}</p>}

      {/* Checks */}
      <ul className="space-y-1">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-xs">
            {check.passed ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.passed ? "text-emerald-600" : "text-muted-foreground"}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
