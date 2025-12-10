import assert from "node:assert/strict";
import { validateDateOfBirth, validatePhoneNumber, validateStateCode } from "@/lib/validation/identity";
import { validatePassword } from "@/lib/validation/password";

type Case<T> = { value: T; expectValid: boolean; message?: string };

const today = new Date();
const futureYear = today.getFullYear() + 1;
const futureDate = `${futureYear}-01-01`;

const dobCases: Case<string>[] = [
  { value: "1990-01-01", expectValid: true },
  { value: futureDate, expectValid: false, message: "future" },
  { value: `${today.getFullYear() - 10}-12-31`, expectValid: false, message: "18" },
  { value: "1890-01-01", expectValid: false, message: "old" },
  { value: "1990/01/01", expectValid: false, message: "format" },
];

const stateCases: Case<string>[] = [
  { value: "CA", expectValid: true },
  { value: "ny", expectValid: true },
  { value: "XX", expectValid: false, message: "state" },
  { value: "C", expectValid: false, message: "state" },
];

const phoneCases: Case<string>[] = [
  { value: "+15551234567", expectValid: true },
  { value: "15551234567", expectValid: true },
  { value: "+441234567890", expectValid: true },
  { value: "12345", expectValid: false, message: "phone" },
  { value: "abc1234567", expectValid: false, message: "phone" },
  { value: "+0012345678", expectValid: false, message: "phone" },
];

const passwordCases: Case<string>[] = [
  { value: "Str0ng!Password", expectValid: true },
  { value: "short1!", expectValid: false, message: "12" },
  { value: "alllowercase123!", expectValid: false, message: "uppercase" },
  { value: "ALLUPPER123!", expectValid: false, message: "lowercase" },
  { value: "NoNumber!!!!", expectValid: false, message: "number" },
  { value: "NoSymbol1234", expectValid: false, message: "symbol" },
];

const runCases = (label: string, cases: Case<string>[], validator: (v: string) => true | string) => {
  for (const testCase of cases) {
    const result = validator(testCase.value);
    const passed =
      (testCase.expectValid && result === true) || (!testCase.expectValid && result !== true && typeof result === "string");

    if (!passed) {
      assert.fail(`[${label}] "${testCase.value}" failed: got "${result}"`);
    }

    if (!testCase.expectValid && typeof result === "string" && testCase.message) {
      assert.ok(
        result.toLowerCase().includes(testCase.message.toLowerCase()),
        `[${label}] "${testCase.value}" expected message to include "${testCase.message}", got "${result}"`
      );
    }

    console.log(`PASS - ${label} - ${testCase.expectValid ? "valid" : "invalid"}: ${testCase.value}`);
  }
};

runCases("DOB", dobCases, validateDateOfBirth);
runCases("STATE", stateCases, validateStateCode);
runCases("PHONE", phoneCases, validatePhoneNumber);
runCases("PASSWORD", passwordCases, validatePassword);

console.log("userValidation.test.ts passed");
