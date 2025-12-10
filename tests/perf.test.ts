import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { appRouter } from "@/server/routers";
import { db, closeDbConnections, initDb } from "@/lib/db";
import { accounts, sessions, transactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptSensitive } from "@/lib/security/crypto";
import { createContext } from "@/server/trpc";

async function resetDb() {
  await db.delete(sessions).run?.();
  await db.delete(transactions).run?.();
  await db.delete(accounts).run?.();
  await db.delete(users).run?.();
}

async function seedUser() {
  const hashedPassword = await bcrypt.hash("Password!23", 10);
  const ssnEncrypted = encryptSensitive("123456789");
  const user = await db
    .insert(users)
    .values({
      email: "perf@test.com",
      password: hashedPassword,
      firstName: "Perf",
      lastName: "Test",
      phoneNumber: "+15550001111",
      dateOfBirth: "1990-01-01",
      ssn: ssnEncrypted,
      address: "1 Main St",
      city: "Testville",
      state: "CA",
      zipCode: "90001",
    })
    .returning()
    .get();
  return user!;
}

async function runAccountFlow() {
  await resetDb();
  const user = await seedUser();
  const caller = appRouter.createCaller({ user, req: {} as any, res: {} as any });

  // PERF-401: new account should have correct 0 balance, no fallback $100
  const account = await caller.account.createAccount({ accountType: "checking" });
  assert.strictEqual(account.balance, 0, "New account balance should be 0");

  // Fund twice to cover PERF-404/405/406
  const first = await caller.account.fundAccount({ accountId: account.id, amount: 10.5, fundingSource: { type: "bank", accountNumber: "12345678", routingNumber: "123456789" } });
  assert.strictEqual(first.newBalance, 10.5, "Balance should add amount deterministically");

  const second = await caller.account.fundAccount({ accountId: account.id, amount: 2.25, fundingSource: { type: "card", accountNumber: "4242424242424242" } });
  assert.strictEqual(second.newBalance, 12.75, "Balance should reflect cumulative deposits without drift");

  const txns = await caller.account.getTransactions({ accountId: account.id });
  assert.strictEqual(txns.length, 2, "All transactions should be returned");
  assert.ok(txns[0].createdAt >= txns[1].createdAt, "Transactions should be ordered newest first");
  assert.strictEqual(txns[0].amount, 2.25, "Most recent transaction should appear first");
  console.log("PASS - Account flow (PERF-401/404/405/406)");
}

async function runLogoutFlow() {
  await resetDb();
  const user = await seedUser();
  const caller = appRouter.createCaller({ user, req: {} as any, res: {} as any });

  // Create a session manually
  const token = "test-token";
  await db.insert(sessions).values({ userId: user.id, token, expiresAt: new Date(Date.now() + 3600_000).toISOString() });

  const logoutCtx: any = {
    user,
    req: { headers: { cookie: `session=${token}` } },
    res: { setHeader: () => {} },
  };
  const logoutCaller = appRouter.createCaller(logoutCtx);
  const result = await logoutCaller.auth.logout();
  assert.ok(result.success, "Logout should succeed when a session exists");

  const remaining = await db.select().from(sessions).where(eq(sessions.token, token)).get();
  assert.ok(!remaining, "Session should be removed after logout");

  // No session case should report failure
  const resultNoSession = await logoutCaller.auth.logout();
  assert.ok(!resultNoSession.success, "Logout should report no active session when none exists");
  console.log("PASS - Logout flow (PERF-402)");
}

async function runExpiryFlow() {
  await resetDb();
  const user = await seedUser();
  const soonExpiringToken = "expiring-token";
  const expiresAt = new Date(Date.now() + 60_000).toISOString(); // <2 minutes
  await db.insert(sessions).values({ userId: user.id, token: soonExpiringToken, expiresAt });

  const ctx = await createContext({
    req: { headers: { cookie: `session=${soonExpiringToken}` } } as any,
    resHeaders: new Headers(),
  });

  assert.strictEqual(ctx.user, null, "Sessions expiring soon should be treated as expired");
  const removed = await db.select().from(sessions).where(eq(sessions.token, soonExpiringToken)).get();
  assert.ok(!removed, "Near-expiry session should be deleted");
  console.log("PASS - Session expiry buffer (PERF-403)");
}

async function runResourceCleanup() {
  // Ensure init/close cycles do not leak or throw
  initDb();
  closeDbConnections();
  closeDbConnections(); // idempotent
  console.log("PASS - DB connection cleanup (PERF-408)");
}

async function main() {
  await runAccountFlow();
  await runLogoutFlow();
  await runExpiryFlow();
  await runResourceCleanup();
  console.log("perf.test.ts passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
