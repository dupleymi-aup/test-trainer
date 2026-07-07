"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Beaker, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Пароль должен быть не менее 8 символов"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

const otpSchema = z.object({
  code: z.string().length(6, "Код должен состоять из 6 цифр"),
});

type ResetForm = z.infer<typeof resetSchema>;
type OtpForm = z.infer<typeof otpSchema>;

const RESEND_COOLDOWN = 60;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [method, setMethod] = useState<"token" | "phone">("token");
  const [otpVerified, setOtpVerified] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");

  const token = searchParams.get("token");
  const urlMethod = searchParams.get("method");
  const urlPhone = searchParams.get("phone");

  useEffect(() => {
    if (token) setMethod("token");
    else if (urlMethod === "phone" && urlPhone) {
      setMethod("phone");
      setPhone(urlPhone);
    }
  }, [token, urlMethod, urlPhone]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const startCooldown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
  }, []);

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onOtpSubmit = async (data: OtpForm) => {
    if (!phone) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: data.code }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Неверный код");
      } else {
        setResetToken(json.token);
        setOtpVerified(true);
        toast.success("Код подтверждён");
      }
    } catch {
      toast.error("Ошибка при проверке кода");
    } finally {
      setIsLoading(false);
    }
  };

  const onResendSMS = async () => {
    if (!phone || countdown > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", phone }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Ошибка при отправке");
      } else {
        toast.success("Код отправлен повторно");
        startCooldown();
      }
    } catch {
      toast.error("Ошибка при отправке");
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetForm) => {
    const effectiveToken = method === "phone" ? resetToken : token;
    if (!effectiveToken) return;

    setIsLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: effectiveToken,
          newPassword: data.newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Ошибка при сбросе пароля");
      } else {
        toast.success("Пароль успешно изменён");
        router.push("/login");
      }
    } catch {
      toast.error("Ошибка при сбросе пароля");
    } finally {
      setIsLoading(false);
    }
  };

  if (method === "phone" && !otpVerified) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Beaker className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl">Подтверждение кода</CardTitle>
          <CardDescription>
            Введите код из SMS, отправленный на {phone}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit(onOtpSubmit)}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <FormField
                  control={otpForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          {...field}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Подтвердить
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Отправить повторно через {countdown} сек.
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResendSMS}
                disabled={isLoading}
                className="text-sm"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Отправить код повторно
              </Button>
            )}
          </div>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
            >
              Вернуться назад
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Beaker className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl">Новый пароль</CardTitle>
        <CardDescription>Введите новый пароль для вашего аккаунта</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...resetForm}>
          <form
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            className="space-y-4"
          >
            <FormField
              control={resetForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Новый пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        onChange={(e) => {
                          field.onChange(e);
                          setNewPasswordValue(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        aria-label={showNewPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <PasswordStrengthIndicator password={newPasswordValue} />
                </FormItem>
              )}
            />
            <FormField
              control={resetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтвердите пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Сохранить пароль
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
          >
            Вернуться ко входу
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md"><CardHeader><CardTitle>Загрузка...</CardTitle></CardHeader></Card>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
