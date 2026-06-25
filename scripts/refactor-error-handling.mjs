import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const files = globSync("src/app/api/**/*.ts");

let changed = 0;
let skipped = 0;

for (const file of files) {
  let content = readFileSync(file, "utf-8");

  if (!content.includes("logger.error")) continue;
  if (content.includes("withErrorHandler")) {
    skipped++;
    continue;
  }

  const original = content;

  // Replace logger import with withErrorHandler import
  content = content.replace(
    /import \{ logger \} from "@\/lib\/logger";\n/,
    'import { withErrorHandler } from "@/lib/api-error-handler";\n'
  );

  // Also handle when logger is imported alongside other things
  content = content.replace(
    /import \{ ([^}]*), logger ([^}]*) \} from "@\/lib\/logger";/,
    'import { $1$2 } from "@/lib/logger";\nimport { withErrorHandler } from "@/lib/api-error-handler";'
  );

  if (!content.includes("withErrorHandler")) continue;

  // For each export function, wrap it
  // Pattern: export async function NAME(PARAMS?) {\n  try {
  // Replace with: export async function NAME(PARAMS?) {\n  return withErrorHandler(REQ_ARG, async () => {
  content = content.replace(
    /export async function (GET|POST|PATCH|DELETE)\(([^)]*)\)\s*\{\s*try \{/g,
    (match, method, params) => {
      const hasReq = params.includes("req") || params.includes("_req");
      const reqArg = hasReq ? params.split(",")[0].trim().split(":")[0].trim() : 'new Request("http://localhost")';
      return `export async function ${method}(${params}) {\n  return withErrorHandler(${reqArg}, async () => {`;
    }
  );

  // Remove the catch block at the end of the function
  // Pattern: } catch (error) {\n    logger.error(...);\n    return NextResponse.json(...);\n  }\n}
  content = content.replace(
    /\s*\} catch \(error\) \{\s*\n\s*logger\.error\([^)]*\);\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: \d+ \}\);\s*\n\s*\}\s*\n\}/g,
    "\n  });\n}"
  );

  if (content !== original) {
    writeFileSync(file, content, "utf-8");
    changed++;
    console.log(`Changed: ${file}`);
  }
}

console.log(`\nDone. Changed: ${changed}, Skipped: ${skipped}`);
