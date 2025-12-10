import assert from "node:assert/strict";
import {
  validateAmount,
  validateBankAccountNumber,
  validateCardNumber,
  validateRoutingNumber,
} from "@/lib/validation/payment";

const cases = {
  amount: [
    { value: "0.00", valid: false, msg: "0.01" },
    { value: "0.01", valid: true },
    { value: "10000.01", valid: false, msg: "exceed" },
    { value: "10.5", valid: true },
    { value: "0001.00", valid: false, msg: "leading" },
    { value: "01", valid: false, msg: "leading" },
    { value: "-5", valid: false, msg: "invalid" },
    { value: ".50", valid: false, msg: "invalid" },
  ],
  card: [
    { value: "4242424242424242", valid: true },
    { value: "4111111111111111", valid: true },
    { value: "378282246310005", valid: true }, // Amex
    { value: "6011111111111117", valid: true }, // Discover
    { value: "3530111333300000", valid: true }, // JCB
    { value: "30569309025904", valid: true }, // Diners
    { value: "4242 4242 4242 4242", valid: true }, // spaces allowed
    { value: "1234567812345678", valid: false, msg: "card" },
    { value: "4242", valid: false, msg: "digits" },
    { value: "9111111111111111", valid: false, msg: "Card type" },
    { value: "4242424242424241", valid: false, msg: "Invalid card" }, // Luhn fail
  ],
  routing: [
    { value: "123456789", valid: true },
    { value: "12345678", valid: false, msg: "9" },
    { value: "12345678a", valid: false, msg: "9" },
  ],
  bankAccount: [
    { value: "12345678", valid: true },
    { value: "123", valid: false, msg: "4-17" },
    { value: "12345678901234567", valid: true },
    { value: "123456789012345678", valid: false, msg: "17" },
  ],
};

const run = (label: string, arr: { value: string; valid: boolean; msg?: string }[], fn: (v: string) => true | string) => {
  for (const c of arr) {
    const res = fn(c.value);
    const passed = (c.valid && res === true) || (!c.valid && res !== true);
    if (!passed) assert.fail(`[${label}] ${c.value} failed with "${res}"`);
    if (!c.valid && c.msg && typeof res === "string") {
      assert.ok(res.toLowerCase().includes(c.msg.toLowerCase()), `[${label}] expected message containing "${c.msg}" got "${res}"`);
    }
    console.log(`PASS - ${label} - ${c.valid ? "valid" : "invalid"}: ${c.value}`);
  }
};

run("AMOUNT", cases.amount as any, (v) => validateAmount(v));
run("CARD", cases.card as any, validateCardNumber);
run("ROUTING", cases.routing as any, validateRoutingNumber);
run("BANK", cases.bankAccount as any, validateBankAccountNumber);

console.log("paymentValidation.test.ts passed");
