import { z } from "zod";

/** Password policy: 8+ chars, upper, lower, digit, special */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const groupFilterSchema = z.object({
  groupId: z.string().optional(),
});

export const universityFilterSchema = z.object({
  university: z.string().optional(),
});

export const analyticsParamsSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(groupFilterSchema)
  .merge(universityFilterSchema);

export const searchParamsSchema = z.object({
  search: z.string().max(100).default(""),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().min(1),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});
