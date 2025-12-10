import { initTRPC, TRPCError } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function createContext(opts: CreateNextContextOptions | FetchCreateContextFnOptions) {
  // Handle different adapter types
  let req: any;
  let res: any;

  if ("req" in opts && "res" in opts) {
    // Next.js adapter
    req = opts.req;
    res = opts.res;
  } else {
    // Fetch adapter
    req = opts.req;
    res = opts.resHeaders;
  }

  // Get the session token
  let token: string | undefined;

  // For App Router, we need to read cookies from the request headers
  let cookieHeader = "";
  if (req.headers.cookie) {
    // Next.js Pages request
    cookieHeader = req.headers.cookie;
  } else if (req.headers.get) {
    // Fetch request (App Router)
    cookieHeader = req.headers.get("cookie") || "";
  }

  const cookiesObj = Object.fromEntries(
    cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((c: string) => {
        const [key, ...val] = c.split("=");
        return [key, val.join("=")];
      })
  );
  token = cookiesObj.session;

  let user = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "temporary-secret-for-interview") as {
        userId: number;
      };

      const session = await db.select().from(sessions).where(eq(sessions.token, token)).get();

      if (session) {
        const expiresAtDate = new Date(session.expiresAt);
        const expiresInMs = expiresAtDate.getTime() - Date.now();

        // Treat sessions expiring within 2 minutes as expired to reduce near-expiry risk
        if (expiresInMs > 2 * 60 * 1000) {
          user = await db.select().from(users).where(eq(users.id, decoded.userId)).get();
          if (expiresInMs < 5 * 60 * 1000) {
            console.warn("Session about to expire");
          }
        } else {
          // Session is expired or too close to expiry; remove it
          await db.delete(sessions).where(eq(sessions.token, token)).run();
        }
      }
    } catch (error) {
      // Invalid token or decode failure; clear any stored session for this token
      await db.delete(sessions).where(eq(sessions.token, token)).run();
    }
  }

  return {
    user,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
