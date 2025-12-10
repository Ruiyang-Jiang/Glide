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
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) return "Invalid amount";
  if (num < min) return `Amount must be at least $${min.toFixed(2)}`;
  if (num > max) return `Amount cannot exceed $${max.toFixed(2)}`;
  return true;
};

export const validateCardNumber = (value: string) => {
  const cleaned = value.replace(/\s+/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) return "Card number must be 13-19 digits";
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
