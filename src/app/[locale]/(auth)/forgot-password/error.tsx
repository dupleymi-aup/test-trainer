"use client";

import { useTranslations } from "next-intl";

export default function ForgotPasswordError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("authError");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-destructive">{t("error")}</h2>
      <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      <button
        onClick={reset}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
