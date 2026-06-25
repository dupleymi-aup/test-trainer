import { readFileSync, writeFileSync } from "fs";

const files = [
  "src/app/api/admin/analytics/ec-bv-heatmap/route.ts",
  "src/app/api/admin/analytics/error-patterns/route.ts",
  "src/app/api/admin/analytics/group-comparison/route.ts",
  "src/app/api/admin/analytics/task-insights/route.ts",
  "src/app/api/admin/users/export/route.ts",
  "src/app/api/attempts/route.ts",
  "src/app/api/auth/profile/route.ts",
];

for (const file of files) {
  let c = readFileSync(file, "utf8");
  
  // Fix: replace logger import with withErrorHandler
  c = c.replace(/import \{ logger \} from "@\/lib\/logger";\n/, 'import { withErrorHandler } from "@/lib/api-error-handler";\n');
  
  // Fix: replace try { with withErrorHandler
  c = c.replace(/export async function (GET|POST|PATCH|DELETE)\(\) \{\n  try \{/g, 'export async function $1() {\n  return withErrorHandler(new Request("http://localhost"), async () => {');
  
  // Fix: remove orphaned catch blocks at end
  c = c.replace(/\n  \}\n\}\s*$/, "\n  });\n}\n");
  
  writeFileSync(file, c, "utf8");
  console.log("Fixed: " + file);
}
