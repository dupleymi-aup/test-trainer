"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Grid3X3 } from "lucide-react";
import type { EvaluationResult } from "@/lib/evaluator";

interface CoverageMatrixProps {
  result: EvaluationResult;
}

export function CoverageMatrix({ result }: CoverageMatrixProps) {
  const allCoverageItems = [
    ...result.task.equivalenceClasses.map((ec) => ({
      id: ec.id,
      label: ec.name.split(":")[0].trim(), // "EC1", "EC2", etc.
      fullName: ec.name,
      description: ec.description,
      type: "ec" as const,
    })),
    ...result.task.boundaryValues.map((bv, idx) => ({
      id: `bv-${idx}`,
      label: `BV${idx + 1}`,
      fullName: bv.description,
      description: bv.description,
      type: "bv" as const,
    })),
  ];

  // Build coverage map: testCaseId -> Set of coverage item ids
  const coverageMap = new Map<string, Set<string>>();

  result.results.forEach((r) => {
    const covered = new Set<string>();
    r.coveredClasses.forEach((ecId) => covered.add(ecId));
    r.coveredBoundaries.forEach((bvDesc) => {
      const bvIdx = result.task.boundaryValues.findIndex(
        (bv) => bv.description === bvDesc
      );
      if (bvIdx >= 0) covered.add(`bv-${bvIdx}`);
    });
    coverageMap.set(r.testCase.id, covered);
  });

  // Calculate per-column coverage stats
  const columnStats = allCoverageItems.map((item) => {
    const coveredCount = result.results.filter((r) => {
      const covered = coverageMap.get(r.testCase.id);
      return covered?.has(item.id);
    }).length;
    return {
      ...item,
      coveredCount,
      totalTests: result.results.length,
      coveragePct:
        result.results.length > 0
          ? Math.round((coveredCount / result.results.length) * 100)
          : 0,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-blue-600" />
          Матрица покрытия
          <Badge variant="secondary" className="ml-auto text-xs">
            {result.coveredEcsCount + result.coveredBvsCount}/
            {result.totalEcs + result.totalBvs}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary bar */}
        <div className="flex flex-wrap gap-2 mb-3">
          {columnStats.map((stat) => (
            <TooltipProvider key={stat.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium cursor-default transition-colors ${
                      stat.coveredCount > 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {stat.coveredCount > 0 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    <span className="font-mono">{stat.label}</span>
                    {stat.coveredCount > 0 && (
                      <span className="opacity-70">{stat.coveredCount}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs font-medium">{stat.fullName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stat.description}
                  </p>
                  <p className="text-[10px] mt-1">
                    Покрытие: {stat.coveredCount}/{stat.totalTests} тестов (
                    {stat.coveragePct}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Matrix table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-left font-medium text-muted-foreground min-w-[30px] sticky left-0 bg-background z-10">
                  #
                </th>
                <th className="p-1.5 text-left font-medium text-muted-foreground min-w-[120px] sticky left-[30px] bg-background z-10">
                  Тест-кейс
                </th>
                {columnStats.map((stat) => (
                  <th
                    key={stat.id}
                    className="p-1 text-center min-w-[32px]"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-mono font-bold cursor-help ${
                              stat.coveredCount > 0
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {stat.label.replace(/^EC|^BV/, "").replace("bv-", "")}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs font-medium">{stat.fullName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stat.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, idx) => (
                <tr
                  key={r.testCase.id}
                  className="border-t border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-1.5 text-muted-foreground sticky left-0 bg-background z-10">
                    {idx + 1}
                  </td>
                  <td className="p-1.5 sticky left-[30px] bg-background z-10 max-w-[200px]">
                    <div className="truncate" title={`(${r.testCase.inputs.join(", ")})`}>
                      <code className="text-[10px] font-mono">
                        ({r.testCase.inputs.join(", ")})
                      </code>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {r.testCase.category}
                    </div>
                  </td>
                  {columnStats.map((stat) => {
                    const isCovered =
                      coverageMap.get(r.testCase.id)?.has(stat.id) ?? false;
                    return (
                      <td key={stat.id} className="p-1 text-center">
                        {isCovered ? (
                          <div
                            className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-emerald-500/20 dark:bg-emerald-500/30"
                            title={`Покрыто: ${stat.fullName}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <div
                            className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-muted/20"
                            title={`Не покрыто: ${stat.fullName}`}
                          >
                            <XCircle className="h-3 w-3 text-muted-foreground/30" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Coverage summary */}
        <div className="mt-3 pt-2 border-t flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>
            EC: {result.coveredEcsCount}/{result.totalEcs} ({result.ecCoverage}%)
          </span>
          <span>
            BV: {result.coveredBvsCount}/{result.totalBvs} ({result.boundaryCoverage}%)
          </span>
          <span>Тестов: {result.results.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}
