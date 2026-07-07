"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  const t = useTranslations("help");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("homeLink")}
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("ecTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t("ecDesc")}</p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="font-medium">{t("ecPrinciple")}</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">{t("ecExample1")}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t("ecExample1a")}</li>
                <li>{t("ecExample1b")}</li>
                <li>{t("ecExample1c")}</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <code className="text-sm">{t("ecExample2")}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("bvTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t("bvDesc")}</p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="font-medium">{t("bvPrinciple")}</p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>{t("bvExample1")}</li>
              <li>{t("bvExample2")}</li>
              <li>{t("bvExample3")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("ecBvCombined")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{t("ecBvCombinedDesc")}</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
              <li>{t("step4")}</li>
            </ol>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-700 dark:text-emerald-400">{t("bestPractices")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">&#x2713;</span>
                    <span>{t(`bp${i}`)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">{t("commonMistakes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">&#x2717;</span>
                    <span>{t(`cm${i}`)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
