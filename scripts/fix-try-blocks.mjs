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

let changed = 0;

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  const original = content;

  // Step 1: Replace logger import
  content = content.replace(
    /import \{ logger \} from "@\/lib\/logger";\n/,
    'import { withErrorHandler } from "@/lib/api-error-handler";\n'
  );

  // Step 2: Replace `export async function GET() {\n  try {` with withErrorHandler
  content = content.replace(
    /(export async function (GET|POST|PATCH|DELETE)\(\)) \{\n  try \{/,
    '$1 {\n  return withErrorHandler(new Request("http://localhost"), async () => {'
  );

  // Step 2b: Replace `export async function GET(req: Request) {\n  try {`
  content = content.replace(
    /(export async function (GET|POST|PATCH|DELETE)\(req: Request\)) \{\n  try \{/,
    '$1 {\n  return withErrorHandler(req, async () => {'
  );

  // Step 3: Fix the closing - replace `  }\n}` at end with `  });\n}`
  // The old try-catch left a `  }` before the final `}`. We need `  });` instead.
  content = content.replace(/\n  \}\n\}(\s*)$/, "\n  });\n}$1");

  if (content !== original) {
    writeFileSync(file, content, "utf-8");
    changed++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nFixed ${changed} files`);
