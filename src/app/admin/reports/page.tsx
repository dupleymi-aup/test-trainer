"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CalendarCheck, Download, BarChart3, AlertTriangle, TrendingUp } from "lucide-react";

const reportCards = [
  { href: "/admin/reports/students", label: "Отчёт по студентам", description: "Сводная статистика по всем студентам платформы", icon: Users },
  { href: "/admin/reports/deadline-compliance", label: "Соблюдение дедлайнов", description: "Статистика соблюдения дедлайнов студентами", icon: CalendarCheck },
  { href: "/admin/reports/export", label: "Центр экспорта", description: "Экспорт отчётов в CSV и JSON форматах", icon: Download },
  { href: "/admin/analytics", label: "Аналитика платформы", description: "Полная аналитика платформы", icon: BarChart3 },
  { href: "/admin/analytics/predictions", label: "Прогнозы и риски", description: "Предиктивная аналитика и выявление студентов группы риска", icon: AlertTriangle },
  { href: "/admin/analytics/teacher-performance", label: "Эффективность преподавателей", description: "Сравнительный анализ преподавателей", icon: TrendingUp },
  { href: "/admin/executive", label: "Executive Summary", description: "Краткая сводка для руководства", icon: FileText },
];

export default function AdminReportsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Отчёты</h2>
          <p className="text-sm text-muted-foreground mt-1">Все доступные отчёты и экспорты платформы</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <Icon className="h-6 w-6 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-sm mb-1">{card.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
