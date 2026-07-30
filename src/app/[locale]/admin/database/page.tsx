"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useFetchData } from "@/hooks/use-fetch-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface HealthStatus {
  status: string;
  tables?: Record<string, number>;
  totalRecords?: number;
  error?: string;
  timestamp?: string;
}

export default function AdminDatabasePage() {
  const t = useTranslations("adminDatabase");
  const locale = useLocale();
  const { data: health, loading, refetch } = useFetchData<HealthStatus>("/api/admin/database/health");

  if (loading) return <AdminLayout><div className="p-8 text-center">{t("loading")}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{t("databaseTitle")}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/api/admin/database/backup?format=sqlite" download>
                  <Download className="h-4 w-4 mr-1" /> {t("downloadDb")}
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/admin/database/backup?format=json" target="_blank">
                  <RefreshCw className="h-4 w-4 mr-1" /> {t("jsonStats")}
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> {t("refresh")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {health && (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={health.status === "healthy" ? "default" : "destructive"}>
                    {health.status === "healthy" ? t("healthy") : t("error")}
                  </Badge>
                  {health.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {t("checkedAt")}: {new Date(health.timestamp).toLocaleString(locale === "ru" ? "ru-RU" : locale === "zh" ? "zh-CN" : "en-US")}
                    </span>
                  )}
                </div>
                {health.error && (
                  <p className="text-sm text-rose-600 mt-2">{health.error}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {health?.tables && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("tables")}</CardTitle></CardHeader>
            <CardContent>
              {health && health.totalRecords && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-muted-foreground">{t("totalRecords")}</span>
                  <Badge>{health.totalRecords.toLocaleString()}</Badge>
                </div>
              )}
              <div className="space-y-1">
                {health && Object.entries(health.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-sm py-1.5 border-b border-dashed last:border-0">
                    <span className="font-medium">{t(`table.${table}`, { defaultValue: table })}</span>
                    <span className="text-muted-foreground">{count.toLocaleString()} {t("records")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
