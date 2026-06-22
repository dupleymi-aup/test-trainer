import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const importSchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
  defaultRole: z.nativeEnum({ STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN" }).optional().default("STUDENT"),
  defaultPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

describe("importSchema — CSV validation", () => {
  it("accepts valid CSV with default role", () => {
    const result = importSchema.safeParse({
      csv: "name,email\nIvan,ivan@test.com",
      defaultPassword: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRole).toBe("STUDENT");
    }
  });

  it("accepts custom role", () => {
    const result = importSchema.safeParse({
      csv: "name,email\nIvan,ivan@test.com",
      defaultRole: "TEACHER",
      defaultPassword: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultRole).toBe("TEACHER");
    }
  });

  it("rejects empty CSV", () => {
    const result = importSchema.safeParse({ csv: "", defaultPassword: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = importSchema.safeParse({ csv: "name,email\ntest,t@t.com", defaultPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = importSchema.safeParse({
      csv: "name,email\nt,t@t.com",
      defaultRole: "GUEST",
      defaultPassword: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("CSV row parsing logic", () => {
  function parseCSV(csv: string) {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return { error: "CSV must have a header row and at least one data row" };

    const MAX_IMPORT_ROWS = 1000;
    const dataRows = lines.length - 1;
    if (dataRows > MAX_IMPORT_ROWS) {
      return { error: `CSV must have at most ${MAX_IMPORT_ROWS} data rows (got ${dataRows})` };
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const rows: Array<{ email: string; name?: string; phone?: string; group?: string; university?: string }> = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v: string) => v.trim());
      if (values.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });

      const email = row.email?.toLowerCase().trim();
      if (!email) {
        errors.push(`Row ${i}: missing email`);
        continue;
      }

      if (rows.some((r) => r.email === email)) {
        errors.push(`Row ${i}: duplicate email ${email}`);
        continue;
      }

      rows.push({
        email,
        name: row.name || undefined,
        phone: row.phone || undefined,
        group: row.group || undefined,
        university: row.university || undefined,
      });
    }

    return { rows, errors };
  }

  it("parses valid 2-row CSV", () => {
    const result = parseCSV("name,email\nIvan,ivan@test.com");
    expect(result).toEqual({
      rows: [{ email: "ivan@test.com", name: "Ivan" }],
      errors: [],
    });
  });

  it("parses multi-column CSV", () => {
    const result = parseCSV("name,email,phone,group,university\nIvan,ivan@test.com,+79001234567,CS-1,MSU");
    expect(result).toEqual({
      rows: [{ email: "ivan@test.com", name: "Ivan", phone: "+79001234567", group: "CS-1", university: "MSU" }],
      errors: [],
    });
  });

  it("normalizes email to lowercase", () => {
    const result = parseCSV("name,email\nIvan,IVAN@TEST.COM");
    expect(result.rows[0].email).toBe("ivan@test.com");
  });

  it("rejects CSV with only header", () => {
    const result = parseCSV("name,email");
    expect("error" in result && result.error).toBe("CSV must have a header row and at least one data row");
  });

  it("rejects empty CSV", () => {
    const result = parseCSV("");
    expect("error" in result && result.error).toBe("CSV must have a header row and at least one data row");
  });

  it("skips rows with missing email", () => {
    const result = parseCSV("name,email\nIvan,\nBoris,boris@test.com");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe("boris@test.com");
    expect(result.errors).toContain("Row 1: missing email");
  });

  it("deduplicates emails within batch", () => {
    const result = parseCSV("name,email\nIvan,ivan@test.com\nPetr,ivan@test.com");
    expect(result.rows).toHaveLength(1);
    expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("rejects CSV exceeding 1000 rows", () => {
    const header = "name,email";
    const rows = Array.from({ length: 1001 }, (_, i) => `User${i},u${i}@test.com`);
    const result = parseCSV([header, ...rows].join("\n"));
    expect("error" in result && result.error).toContain("1000");
  });

  it("handles 1000 rows (at limit)", () => {
    const header = "name,email";
    const rows = Array.from({ length: 1000 }, (_, i) => `User${i},u${i}@test.com`);
    const result = parseCSV([header, ...rows].join("\n"));
    expect("rows" in result && result.rows).toHaveLength(1000);
  });

  it("skips rows with < 2 columns", () => {
    const result = parseCSV("name,email\nIvan");
    expect(result.rows).toHaveLength(0);
  });
});
