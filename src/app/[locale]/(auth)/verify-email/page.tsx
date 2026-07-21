"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Beaker, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const controller = new AbortController();
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      toast.error("Missing verification token");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          setStatus("success");
          toast.success("Email подтверждён");
        } else {
          setStatus("error");
          toast.error(json.error || "Error verifying email");
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus("error");
        toast.error("Error verifying email");
      });
    return () => controller.abort();
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Beaker className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl">Подтверждение email</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <CardDescription>Проверяем токен...</CardDescription>
          </div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <CardDescription>
              Ваш email успешно подтверждён!
            </CardDescription>
            <Button asChild>
              <Link href="/login">Войти</Link>
            </Button>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <CardDescription>
              Токен неверный или срок его действия истёк
            </CardDescription>
            <Button asChild variant="outline">
              <Link href="/register">Зарегистрироваться снова</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md"><CardHeader><CardTitle>Loading...</CardTitle></CardHeader></Card>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
