"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Beaker, Loader2, Eye, EyeOff, GraduationCap, Users, Shield } from "lucide-react";

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
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";

const registerSchema = z
  .object({
    name: z.string().min(2, "nameMinLength"),
    email: z.string().email("invalidEmail"),
    phone: z.string().optional().or(z.literal("")),
    password: z.string().min(8, "passwordMinLength"),
    confirmPassword: z.string(),
    accountType: z.enum(["STUDENT", "TEACHER"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMismatch",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const accountTypeKeys = [
  {
    value: "STUDENT" as const,
    titleKey: "student",
    descKey: "studentDescription",
    icon: Users,
    color: "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    activeColor: "border-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 ring-2 ring-emerald-600",
    textColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    value: "TEACHER" as const,
    titleKey: "teacher",
    descKey: "teacherDescription",
    icon: GraduationCap,
    color: "border-blue-600 bg-blue-50 dark:bg-blue-950/30",
    activeColor: "border-blue-600 bg-blue-100 dark:bg-blue-950/50 ring-2 ring-blue-600",
    textColor: "text-blue-700 dark:text-blue-400",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const registerSchemaWithTranslations = z
    .object({
      name: z.string().min(2, t("nameMinLength")),
      email: z.string().email(t("invalidEmail")),
      phone: z.string().optional().or(z.literal("")),
      password: z.string().min(8, t("passwordMinLength")),
      confirmPassword: z.string(),
      accountType: z.enum(["STUDENT", "TEACHER"]),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchemaWithTranslations),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      accountType: "STUDENT",
    },
  });

  const accountType = form.watch("accountType");

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          password: data.password,
          role: data.accountType,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || t("registerError"));
      } else {
        toast.success(t("registerSuccess"));
        router.push("/login");
      }
    } catch {
      toast.error(t("registerError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Beaker className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
          <CardDescription>
            {t("registerSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Account Type Selector */}
          <div className="mb-6">
            <FormLabel className="mb-3 block">{t("accountType")}</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              {accountTypeKeys.map((type) => {
                const Icon = type.icon;
                const isActive = accountType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isActive ? type.activeColor : `${type.color} opacity-70 hover:opacity-100`
                    }`}
                    onClick={() => form.setValue("accountType", type.value)}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${type.textColor}`} />
                    <div className={`font-semibold text-sm ${type.textColor}`}>
                      {t(type.titleKey)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t(type.descKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("enterName")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon("email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon("phone")} <span className="text-muted-foreground">({t("optional")})</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+79991234567"
                        autoComplete="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          onChange={(e) => {
                            field.onChange(e);
                            setPasswordValue(e.target.value);
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <PasswordStrengthIndicator password={passwordValue} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
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
                          aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("signUp")}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            {t("hasAccount")}{" "}
            <Link
              href="/login"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
            >
              {t("signIn")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
