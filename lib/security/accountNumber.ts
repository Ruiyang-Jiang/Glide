import crypto from "crypto";

export function generateSecureAccountNumber(): string {
  const randomValue = crypto.randomBytes(8); // 64 bits of entropy
  const asNumber = BigInt("0x" + randomValue.toString("hex")) % 10_000_000_000n; // 10 digits
  return asNumber.toString().padStart(10, "0");
}
