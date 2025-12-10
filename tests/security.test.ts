import assert from "node:assert/strict";
import { encryptSensitive, decryptSensitive } from "@/lib/security/crypto";
import { generateSecureAccountNumber } from "@/lib/security/accountNumber";
import { sanitizeTransactionDescription } from "@/lib/transactions/format";

// SSN encryption/decryption round-trip and uniqueness
const ssn = "123456789";
const encryptedA = encryptSensitive(ssn);
const encryptedB = encryptSensitive(ssn);

assert.notStrictEqual(encryptedA, ssn, "Encrypted SSN should not match plaintext");
assert.notStrictEqual(encryptedA, encryptedB, "Encryption should include randomness (iv) for the same input)");

const decrypted = decryptSensitive(encryptedA);
assert.strictEqual(decrypted, ssn, "Decryption should recover the original SSN");
console.log("PASS - SSN encryption/decryption");

// Account number generation should be numeric, padded, and collision-resistant in small sample
const generated = new Set<string>();
for (let i = 0; i < 50; i++) {
  const acct = generateSecureAccountNumber();
  assert.match(acct, /^\d{10}$/, "Account number must be 10 numeric characters");
  assert.ok(!generated.has(acct), "Account numbers in sample should be unique");
  generated.add(acct);
}
console.log("PASS - Account number randomness and format");

// Transaction description sanitization should remove HTML and provide a safe fallback
const dirty = '<img src=x onerror="alert(1)">Deposit received<script>alert(1)</script>';
const cleaned = sanitizeTransactionDescription(dirty);
assert.strictEqual(cleaned, "Deposit received", "Sanitizer should strip HTML tags and scripts");
assert.strictEqual(sanitizeTransactionDescription(""), "-", "Empty descriptions should return fallback");
assert.strictEqual(sanitizeTransactionDescription(null as unknown as string), "-", "Null descriptions should return fallback");
console.log("PASS - Transaction description sanitization");

console.log("security.test.ts passed");
