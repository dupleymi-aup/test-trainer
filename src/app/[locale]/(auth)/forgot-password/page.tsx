"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-client";
import { logClientError } from "@/lib/logger";
import { Beaker, Loader2, Mail, Phone, RefreshCw } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmailForm = z.infer<ReturnType<typeof getEmailSchema>>;
type PhoneForm = z.infer<ReturnType<typeof getPhoneSchema>>;

const RESEND_COOLDOWN = 60;

function getEmailSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("invalidEmail")),
  });
}

function getPhoneSchema(t: (key: string) => string) {
  return z.object({
    phone: z.string().min(10, t("phoneMinLength")),
  });
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations("forgotPassword");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastMethod, setLastMethod] = useState<"email" | "phone" | null>(null);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(getEmailSchema(t)),
    defaultValues: { email: "" },
  });

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(getPhoneSchema(t)),
    defaultValues: { phone: "" },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const startCooldown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
  }, []);

  const onEmailSubmit = async (data: EmailForm) => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, phone: "" }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || t("sendError"));
      } else {
        toast.success(json.message);
        startCooldown();
        setLastMethod("email");
        if (json.token) {
          router.push(`/reset-password?token=${json.token}`);
        }
      }
    } catch (e) {
      logClientError("Failed to request email recovery code", e);
      toast.error(t("sendError"));
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", phone: data.phone }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || t("sendError"));
      } else {
        toast.success(json.message);
        startCooldown();
        setLastMethod("phone");
        router.push(`/reset-password?method=phone&phone=${encodeURIComponent(data.phone)}`);
      }
    } catch (e) {
      logClientError("Failed to request phone password code", e);
      toast.error(t("sendError"));
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    if (!lastMethod || countdown > 0) return;

    if (lastMethod === "email") {
      const email = emailForm.getValues("email");
      if (email) {
        await onEmailSubmit({ email });
      }
    } else {
      const phone = phoneForm.getValues("phone");
      if (phone) {
        await onPhoneSubmit({ phone });
      }
    }
  };

  const isCooldown = countdown > 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Beaker className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone">
              <Phone className="mr-2 h-4 w-4" />
              {t("phone")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("sendLink")}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="phone" className="mt-4">
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+79991234567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("sendCode")}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {lastMethod && (
          <div className="mt-4 text-center">
            {isCooldown ? (
              <p className="text-sm text-muted-foreground">
                {t("resendIn", { countdown })}
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResend}
                className="text-sm"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {t("resend")}
              </Button>
            )}
          </div>
        )}

        <div className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
