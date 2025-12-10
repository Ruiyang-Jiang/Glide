import assert from "node:assert/strict";
import { validateEmailFormat } from "@/lib/validation/email";

type Case = { email: string; expectValid: boolean; message?: string };

const cases: Case[] = [
  // Valid emails should pass untouched
  { email: "user@example.com", expectValid: true },
  { email: "USER@Example.com", expectValid: true },
  { email: "first.last+tag@sub.domain.com", expectValid: true },
  { email: "user_name-123@domain.co", expectValid: true },

  // Obvious invalid formats
  { email: "plainaddress", expectValid: false, message: "invalid email" },
  { email: "missingatsign.com", expectValid: false, message: "invalid email" },
  { email: "user@domain", expectValid: false, message: "invalid email" },
  { email: "user@domain..com", expectValid: false, message: "invalid email" },
  { email: "user..name@example.com", expectValid: false, message: "invalid email" },
  { email: "user@.example.com", expectValid: false, message: "invalid email" },
  { email: "user name@example.com", expectValid: false, message: "invalid email" },

  // Common typo: .con instead of .com
  { email: "person@example.con", expectValid: false, message: ".con" },

  // Leading/trailing spaces should be trimmed but still validated
  { email: " user@example.com ", expectValid: false, message: "invalid email" },
];

for (const testCase of cases) {
  const result = validateEmailFormat(testCase.email);
  const passed =
    (testCase.expectValid && result === true) ||
    (!testCase.expectValid && result !== true && typeof result === "string");

  if (!passed) {
    assert.fail(`Case "${testCase.email}" failed: got "${result}"`);
  }

  if (!testCase.expectValid && typeof result === "string" && testCase.message) {
    assert.ok(
      result.toLowerCase().includes(testCase.message.toLowerCase()),
      `Case "${testCase.email}" expected message to include "${testCase.message}", got "${result}"`
    );
  }

  console.log(`PASS - ${testCase.expectValid ? "valid" : "invalid"}: ${testCase.email}`);
}

console.log("emailValidation.test.ts passed");
