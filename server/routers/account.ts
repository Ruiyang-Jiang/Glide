import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateSecureAccountNumber } from "@/lib/security/accountNumber";
import {
  validateAmount,
  validateBankAccountNumber,
  validateCardNumber,
  validateRoutingNumber,
} from "@/lib/validation/payment";
import { sanitizeTransactionDescription } from "@/lib/transactions/format";

export const accountRouter = router({
  createAccount: protectedProcedure
    .input(
      z.object({
        accountType: z.enum(["checking", "savings"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already has an account of this type
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, ctx.user.id), eq(accounts.accountType, input.accountType)))
        .get();

      if (existingAccount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `You already have a ${input.accountType} account`,
        });
      }

      let accountNumber: string | undefined;
      let isUnique = false;

      // Generate unique account number with a capped retry window to prevent infinite loops
      for (let attempts = 0; attempts < 20 && !isUnique; attempts++) {
        accountNumber = generateSecureAccountNumber();
        const existing = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber)).get();
        isUnique = !existing;
      }

      if (!isUnique || !accountNumber) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to generate a unique account number",
        });
      }

      await db.insert(accounts).values({
        userId: ctx.user.id,
        accountNumber,
        accountType: input.accountType,
        balance: 0,
        status: "active",
      });

      // Fetch the created account
      const account = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber)).get();

      if (!account) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Account created but could not be retrieved",
        });
      }

      return account;
    }),

  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id));

    return userAccounts;
  }),

  fundAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        amount: z
          .number()
          .superRefine((val, ctx) => {
            const res = validateAmount(val, 0.01, 10000);
            if (res !== true) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: typeof res === "string" ? res : "Invalid amount" });
            }
          }),
        fundingSource: z
          .object({
            type: z.enum(["card", "bank"]),
            accountNumber: z.string(),
            routingNumber: z.string().optional(),
          })
          .superRefine((val, ctx) => {
            if (val.type === "card") {
              const card = validateCardNumber(val.accountNumber);
              if (card !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, message: card as string });
            } else {
              const acct = validateBankAccountNumber(val.accountNumber);
              if (acct !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, message: acct as string });

              const routing = val.routingNumber ? validateRoutingNumber(val.routingNumber) : "Routing number is required";
              if (routing !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, message: routing as string });
            }
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const amount = parseFloat(input.amount.toString());

      // Verify account belongs to user
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .get();

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      if (account.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account is not active",
        });
      }

      // Create transaction
      await db.insert(transactions).values({
        accountId: input.accountId,
        type: "deposit",
        amount,
        description: sanitizeTransactionDescription(`Funding from ${input.fundingSource.type}`),
        status: "completed",
        processedAt: new Date().toISOString(),
      });

      // Fetch the newly created transaction for this account (latest)
      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.accountId))
        .orderBy(desc(transactions.createdAt), desc(transactions.id))
        .limit(1)
        .get();

      // Update account balance and return deterministic new balance
      await db
        .update(accounts)
        .set({
          balance: account.balance + amount,
        })
        .where(eq(accounts.id, input.accountId));

      const newBalance = account.balance + amount;

      return {
        transaction,
        newBalance,
      };
    }),

  getTransactions: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify account belongs to user
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .get();

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.accountId))
        .orderBy(desc(transactions.createdAt), desc(transactions.id));

      return accountTransactions;
    }),
});
