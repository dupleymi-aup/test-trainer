import { readFileSync, writeFileSync } from "fs";

const files = [
  "src/app/api/admin/analytics/ec-bv-gaps/route.ts",
  "src/app/api/admin/analytics/ec-bv-heatmap/route.ts",
  "src/app/api/admin/analytics/error-patterns/route.ts",
  "src/app/api/admin/analytics/group-comparison/route.ts",
  "src/app/api/admin/analytics/task-insights/route.ts",
  "src/app/api/admin/users/export/route.ts",
  "src/app/api/attempts/route.ts",
  "src/app/api/auth/profile/route.ts",
  "src/app/api/auth/verify-email/route.ts",
];

let changed = 0;

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  const original = content;

  // Replace logger import with withErrorHandler
  content = content.replace(
    /import \{ logger \} from "@\/lib\/logger";\n/,
    'import { withErrorHandler } from "@/lib/api-error-handler";\n'
  );

  // For GET() with no params
  content = content.replace(
    /export async function GET\(\) \{\n  try \{/g,
    'export async function GET() {\n  return withErrorHandler(new Request("http://localhost"), async () => {'
  );

  // For GET(req: Request)
  content = content.replace(
    /export async function GET\(req: Request\) \{\n  try \{/g,
    "export async function GET(req: Request) {\n  return withErrorHandler(req, async () => {"
  );

  // For POST(req: Request)
  content = content.replace(
    /export async function POST\(req: Request\) \{\n  try \{/g,
    "export async function POST(req: Request) {\n  return withErrorHandler(req, async () => {"
  );

  // For PATCH(req: Request)
  content = content.replace(
    /export async function PATCH\(req: Request\) \{\n  try \{/g,
    "export async function PATCH(req: Request) {\n  return withErrorHandler(req, async () => {"
  );

  // Remove catch blocks at end of function
  content = content.replace(
    /\s*\} catch \(error\) \{\s*\n\s*logger\.error\([^)]*\);\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: \d+ \}\);\s*\n\s*\}\s*\n\}/g,
    "\n  });\n}"
  );

  // Also handle catch with error.message in response
  content = content.replace(
    /\s*\} catch \(error\) \{\s*\n\s*logger\.error\([^)]*\);\s*\n\s*return NextResponse\.json\(\{\s*error: "Failed[^"]*"\s*\}, \{ status: 500 \}\);\s*\n\s*\}\s*\n\}/g,
    "\n  });\n}"
  );

  if (content !== original) {
    writeFileSync(file, content, "utf-8");
    changed++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nFixed ${changed} files`);
