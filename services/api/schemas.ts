import { z } from "zod";

// Auth
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().optional(),
  avatarUrl: z.string().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionSchema = z.object({
  authenticated: z.boolean(),
  requiresTotp: z.boolean().optional(),
  session: z
    .object({
      uid: z.string(),
      role: z.string(),
      type: z.string(),
    })
    .optional(),
  user: AuthUserSchema.optional(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;
