"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface GroupComparisonTableProps {
  data: Array<{
    groupId: string;
    groupName: string;
    studentCount: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    totalAttempts: number;
  }>;
}

export function GroupComparisonTable({ data }: GroupComparisonTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Сравнение групп</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-8">
            Нет данных о группах
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Сравнение групп</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Группа</TableHead>
              <TableHead className="text-right">Студенты</TableHead>
              <TableHead className="text-right">Ср. балл</TableHead>
              <TableHead className="text-right">Ср. EC</TableHead>
              <TableHead className="text-right">Ср. BV</TableHead>
              <TableHead className="text-right">Попытки</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((group) => (
              <TableRow key={group.groupId}>
                <TableCell className="font-medium">
                  <Link
                    href={`/teacher/groups`}
                    className="hover:underline"
                  >
                    {group.groupName}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{group.studentCount}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={group.avgScore >= 75 ? "default" : group.avgScore >= 50 ? "secondary" : "destructive"}
                  >
                    {group.avgScore}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={group.avgEc} className="h-1.5 w-16" />
                    <span className="text-xs">{group.avgEc}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={group.avgBv} className="h-1.5 w-16" />
                    <span className="text-xs">{group.avgBv}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {group.totalAttempts}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
