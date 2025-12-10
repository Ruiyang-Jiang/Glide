const luhnCheck = (num: string) => {
  const digits = num.replace(/\s+/g, "");
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

export const validateAmount = (value: string | number, min = 0.01, max = 10000) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Disallow multiple leading zeros (except "0.xx")
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(trimmed)) {
      return "Amount format is invalid or has leading zeros";
    }
  }
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "Invalid amount";
  if (num < min) return `Amount must be at least $${min.toFixed(2)}`;
  if (num > max) return `Amount cannot exceed $${max.toFixed(2)}`;
  return true;
};

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unknown";

const detectCardBrand = (digits: string): CardBrand => {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return "visa"; // 13,16,19
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{2}|[3-6]\d{3}|7[01]\d{2}|720\d{2})\d{10})$/.test(digits)) return "mastercard";
  if (/^3[47]\d{13}$/.test(digits)) return "amex";
  if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13}|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5]))\d{10})$/.test(digits))
    return "discover";
  if (/^35(2[89]|[3-8]\d)\d{12,15}$/.test(digits)) return "jcb";
  if (/^3(0[0-5]\d{11,14}|09\d{10,13}|[689]\d{11,16})$/.test(digits)) return "diners";
  return "unknown";
};

export const validateCardNumber = (value: string) => {
  const cleaned = value.replace(/\s+/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) return "Card number must be 13-19 digits";
  const brand = detectCardBrand(cleaned);
  if (brand === "unknown") return "Card type not recognized";
  if (!luhnCheck(cleaned)) return "Invalid card number";
  return true;
};

export const validateRoutingNumber = (value: string) => {
  const cleaned = value.replace(/\s+/g, "");
  if (!/^\d{9}$/.test(cleaned)) return "Routing number must be 9 digits";
  return true;
};

export const validateBankAccountNumber = (value: string) => {
  const cleaned = value.replace(/\s+/g, "");
  if (!/^\d{4,17}$/.test(cleaned)) return "Account number must be 4-17 digits";
  return true;
};
