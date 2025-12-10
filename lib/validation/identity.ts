const STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validateDateOfBirth = (value: string) => {
  const dob = value.trim();
  if (!isValidDateString(dob)) {
    return "Date of birth must be in YYYY-MM-DD format";
  }

  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const constructed = new Date(year, month - 1, day);
  if (
    constructed.getFullYear() !== year ||
    constructed.getMonth() + 1 !== month ||
    constructed.getDate() !== day
  ) {
    return "Invalid date of birth";
  }

  const today = new Date();
  if (constructed > today) {
    return "Date of birth cannot be in the future";
  }

  const age = today.getFullYear() - year - (today < new Date(today.getFullYear(), constructed.getMonth(), day) ? 1 : 0);
  if (age < 18) {
    return "You must be at least 18 years old";
  }

  if (age > 120) {
    return "Date of birth is unrealistically old";
  }

  return true;
};

export const validateStateCode = (value: string) => {
  const state = value.trim().toUpperCase();
  if (!STATE_CODES.has(state)) {
    return "Use a valid 2-letter US state code";
  }
  return true;
};

export const normalizePhoneNumber = (value: string) => value.replace(/[\s().-]/g, "");

export const validatePhoneNumber = (value: string) => {
  const cleaned = normalizePhoneNumber(value);
  const pattern = /^\+?[1-9]\d{7,14}$/;
  if (!pattern.test(cleaned)) {
    return "Enter a valid phone number (E.164, 8-15 digits, may start with +)";
  }
  return true;
};
