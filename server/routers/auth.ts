import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateEmailFormat } from "@/lib/validation/email";
import { validateDateOfBirth, validatePhoneNumber, validateStateCode } from "@/lib/validation/identity";
import { validatePassword } from "@/lib/validation/password";
import { encryptSensitive } from "@/lib/security/crypto";
import { InferSelectModel } from "drizzle-orm";

const emailSchema = z.string().superRefine((value, ctx) => {
  const result = validateEmailFormat(value);
  if (result !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: typeof result === "string" ? result : "Invalid email address",
    });
  }
});

const phoneSchema = z.string().superRefine((value, ctx) => {
  const result = validatePhoneNumber(value);
  if (result !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: typeof result === "string" ? result : "Invalid phone number",
    });
  }
});

const dobSchema = z.string().superRefine((value, ctx) => {
  const result = validateDateOfBirth(value);
  if (result !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: typeof result === "string" ? result : "Invalid date of birth",
    });
  }
});

const stateSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .superRefine((value, ctx) => {
    const result = validateStateCode(value);
    if (result !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: typeof result === "string" ? result : "Invalid state code",
      });
    }
  });

const sanitizeUser = (user: InferSelectModel<typeof users>) => {
  const { password, ssn, ...rest } = user;
  return rest;
};

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: z.string().superRefine((value, ctx) => {
          const res = validatePassword(value);
          if (res !== true) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: res as string });
          }
        }),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: phoneSchema,
        dateOfBirth: dobSchema,
        ssn: z.string().regex(/^\d{9}$/),
        address: z.string().min(1),
        city: z.string().min(1),
        state: stateSchema,
        zipCode: z.string().regex(/^\d{5}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.toLowerCase();
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(sql`lower(${users.email})`, normalizedEmail))
        .get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const encryptedSsn = encryptSensitive(input.ssn);

      await db.insert(users).values({
        ...input,
        password: hashedPassword,
        ssn: encryptedSsn,
      });

      // Fetch the created user
      const user = await db
        .select()
        .from(users)
        .where(eq(sql`lower(${users.email})`, normalizedEmail))
        .get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Create session (invalidate any dangling sessions for the new account)
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      // Set cookie
      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: sanitizeUser(user), token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(sql`lower(${users.email})`, input.email.toLowerCase()))
        .get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Enforce single active session per user
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: sanitizeUser(user), token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    let deleted = 0;
    if (ctx.user) {
      // Delete session from database
      let token: string | undefined;
      if ("cookies" in ctx.req) {
        token = (ctx.req as any).cookies.session;
      } else {
        const cookieHeader = ctx.req.headers.get?.("cookie") || (ctx.req.headers as any).cookie;
        token = cookieHeader
          ?.split("; ")
          .find((c: string) => c.startsWith("session="))
          ?.split("=")[1];
      }
      if (token) {
        const result = await db.delete(sessions).where(eq(sessions.token, token)).run();
        deleted = result?.changes ?? 0;
      }
    }

    if ("setHeader" in ctx.res) {
      ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    } else {
      (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    }

    const success = ctx.user ? deleted > 0 : deleted > 0;
    return { success, message: success ? "Logged out successfully" : "No active session" };
  }),
});
