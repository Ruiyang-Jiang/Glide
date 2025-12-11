import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { appRouter } from "@/server/routers";
import { db } from "@/lib/db";
import { accounts, sessions, transactions, users } from "@/lib/db/schema";
import { encryptSensitive } from "@/lib/security/crypto";

async function resetDb() {
  await db.delete(sessions).run?.();
  await db.delete(transactions).run?.();
  await db.delete(accounts).run?.();
  await db.delete(users).run?.();
}

async function seedUser(email: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);
  const encryptedSsn = encryptSensitive("123456789");
  const user = await db
    .insert(users)
    .values({
      email,
      password: hashed,
      firstName: "Auth",
      lastName: "Test",
      phoneNumber: "+15550009999",
      dateOfBirth: "1990-01-01",
      ssn: encryptedSsn,
      address: "1 Auth Way",
      city: "Testville",
      state: "CA",
      zipCode: "90001",
    })
    .returning()
    .get();

  if (!user) {
    throw new Error("Failed to seed user");
  }

  return { user, password };
}

function makeCaller() {
  const headerLog: string[] = [];
  const caller = appRouter.createCaller({
    user: null,
    req: { headers: {}, cookies: {} } as any,
    res: { setHeader: (_name: string, value: string) => headerLog.push(String(value)) },
  });
  return { caller, headerLog };
}

async function testSignupPreservesEmailAndBlocksCaseInsensitiveDuplicates() {
  await resetDb();
  const { caller, headerLog } = makeCaller();
  const email = "MixedCase@Test.COM";
  const password = "Str0ng!Password";

  const signup = await caller.auth.signup({
    email,
    password,
    firstName: "Case",
    lastName: "Check",
    phoneNumber: "+15551234567",
    dateOfBirth: "1990-01-01",
    ssn: "123456789",
    address: "123 Main St",
    city: "Nowhere",
    state: "CA",
    zipCode: "90001",
  });

  assert.strictEqual(signup.user.email, email, "Signup should preserve email casing");
  assert.ok(!("password" in signup.user), "Signup response should not expose password");
  assert.ok(!("ssn" in signup.user), "Signup response should not expose SSN");
  assert.ok(headerLog.some((h) => h.includes(signup.token)), "Signup should set cookie with session token");

  const stored = await db.select().from(users).where(eq(users.id, signup.user.id)).get();
  assert.strictEqual(stored?.email, email, "Stored email should keep original casing");

  let duplicateError: unknown;
  try {
    await caller.auth.signup({
      email: email.toLowerCase(),
      password,
      firstName: "Case",
      lastName: "Check",
      phoneNumber: "+15551234567",
      dateOfBirth: "1990-01-01",
      ssn: "123456789",
      address: "123 Main St",
      city: "Nowhere",
      state: "CA",
      zipCode: "90001",
    });
  } catch (err) {
    duplicateError = err;
  }

  assert.ok(duplicateError instanceof TRPCError && duplicateError.code === "CONFLICT", "Duplicate signup should reject by conflict");
  console.log("PASS - Signup preserves casing and blocks case-insensitive duplicates");
}

async function testLoginReplacesExistingSessions() {
  await resetDb();
  const email = "LoginCase@Test.com";
  const password = "Password!23";
  const { user } = await seedUser(email, password);

  const future = new Date(Date.now() + 86_400_000).toISOString();
  await db.insert(sessions).values([
    { userId: user.id, token: "old-token-1", expiresAt: future },
    { userId: user.id, token: "old-token-2", expiresAt: future },
  ]);

  const { caller, headerLog } = makeCaller();
  const login = await caller.auth.login({ email: email.toLowerCase(), password });

  const remaining = await db.select().from(sessions).where(eq(sessions.userId, user.id));
  assert.strictEqual(remaining.length, 1, "Login should leave exactly one active session");
  assert.strictEqual(remaining[0].token, login.token, "Login should replace old session tokens with the new one");
  assert.ok(headerLog.some((h) => h.includes(login.token)), "Login should write session cookie with new token");
  assert.ok(!("password" in login.user), "Login response should not expose password");
  assert.ok(!("ssn" in login.user), "Login response should not expose SSN");

  console.log("PASS - Login replaces existing sessions and sets cookie with new token");
}

async function main() {
  await testSignupPreservesEmailAndBlocksCaseInsensitiveDuplicates();
  await testLoginReplacesExistingSessions();
  console.log("authFlow.test.ts passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
