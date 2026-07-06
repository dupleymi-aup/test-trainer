// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  passwordSchema,
  paginationSchema,
  dateRangeSchema,
  searchParamsSchema,
  idParamSchema,
  taskIdParamSchema,
  userIdParamSchema,
  analyticsParamsSchema,
  groupFilterSchema,
  universityFilterSchema,
} from "./shared-schemas";

describe("passwordSchema", () => {
  it("accepts valid password", () => {
    expect(passwordSchema.safeParse("Str0ng!Pass").success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    expect(passwordSchema.safeParse("Ab1!abcd").success).toBe(true);
    expect(passwordSchema.safeParse("Ab1!abc").success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(passwordSchema.safeParse("lowercase1!").success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    expect(passwordSchema.safeParse("UPPERCASE1!").success).toBe(false);
  });

  it("rejects password without digit", () => {
    expect(passwordSchema.safeParse("NoDigits!!").success).toBe(false);
  });

  it("rejects password without special character", () => {
    expect(passwordSchema.safeParse("NoSpecial1").success).toBe(false);
  });

  it("rejects password longer than 128 chars", () => {
    const long = "A".repeat(120) + "1a!";
    expect(passwordSchema.safeParse(long).success).toBe(true);
    const tooLong = "A".repeat(126) + "1a!";
    expect(passwordSchema.safeParse(tooLong).success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("defaults to page=1, limit=50", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("accepts valid page and limit", () => {
    const result = paginationSchema.parse({ page: 3, limit: 20 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
  });

  it("rejects limit > 200", () => {
    expect(paginationSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it("rejects page < 1", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.parse({ page: "2", limit: "10" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});

describe("dateRangeSchema", () => {
  it("accepts empty object", () => {
    expect(dateRangeSchema.parse({})).toEqual({});
  });

  it("accepts optional date strings", () => {
    const result = dateRangeSchema.parse({
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });
    expect(result.dateFrom).toBe("2024-01-01");
    expect(result.dateTo).toBe("2024-12-31");
  });
});

describe("searchParamsSchema", () => {
  it("defaults search to empty string", () => {
    expect(searchParamsSchema.parse({}).search).toBe("");
  });

  it("accepts search string", () => {
    expect(searchParamsSchema.parse({ search: "test" }).search).toBe("test");
  });

  it("rejects search > 100 chars", () => {
    expect(
      searchParamsSchema.safeParse({ search: "a".repeat(101) }).success
    ).toBe(false);
  });
});

describe("idParamSchema", () => {
  it("accepts non-empty string", () => {
    expect(idParamSchema.parse({ id: "123" }).id).toBe("123");
  });

  it("rejects empty string", () => {
    expect(idParamSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("taskIdParamSchema", () => {
  it("accepts non-empty string", () => {
    expect(taskIdParamSchema.parse({ taskId: "42" }).taskId).toBe("42");
  });

  it("rejects empty string", () => {
    expect(taskIdParamSchema.safeParse({ taskId: "" }).success).toBe(false);
  });
});

describe("userIdParamSchema", () => {
  it("accepts non-empty string", () => {
    expect(userIdParamSchema.parse({ userId: "user-1" }).userId).toBe("user-1");
  });

  it("rejects empty string", () => {
    expect(userIdParamSchema.safeParse({ userId: "" }).success).toBe(false);
  });
});

describe("analyticsParamsSchema", () => {
  it("merges pagination, date range, group, and university filters", () => {
    const result = analyticsParamsSchema.parse({
      page: 2,
      limit: 10,
      dateFrom: "2024-01-01",
      dateTo: "2024-06-30",
      groupId: "group-1",
      university: "MIT",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.dateFrom).toBe("2024-01-01");
    expect(result.groupId).toBe("group-1");
    expect(result.university).toBe("MIT");
  });

  it("accepts empty object with defaults", () => {
    const result = analyticsParamsSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });
});

describe("groupFilterSchema", () => {
  it("accepts empty object", () => {
    expect(groupFilterSchema.parse({})).toEqual({});
  });

  it("accepts groupId", () => {
    expect(groupFilterSchema.parse({ groupId: "g1" }).groupId).toBe("g1");
  });
});

describe("universityFilterSchema", () => {
  it("accepts empty object", () => {
    expect(universityFilterSchema.parse({})).toEqual({});
  });

  it("accepts university", () => {
    expect(
      universityFilterSchema.parse({ university: "MIT" }).university
    ).toBe("MIT");
  });
});
