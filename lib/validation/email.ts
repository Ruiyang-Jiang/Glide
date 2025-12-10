export const commonTldTypoMessage = "Email domain ends with '.con' - did you mean '.com'?";

const hasCommonTldTypo = (email: string) => {
  const domain = email.split("@")[1];
  if (!domain) return false;
  const parts = domain.split(".");
  const tld = parts[parts.length - 1]?.toLowerCase();
  return tld === "con";
};

export const validateEmailFormat = (email: string) => {
  const trimmed = email.trim();
  if (trimmed !== email) {
    return "Invalid email address";
  }

  const atParts = trimmed.split("@");
  if (atParts.length !== 2) {
    return "Invalid email address";
  }

  const [local, domain] = atParts;
  if (!local || !domain) {
    return "Invalid email address";
  }

  if (local.includes("..") || domain.includes("..")) {
    return "Invalid email address";
  }

  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return "Invalid email address";
  }

  if (!/^[A-Za-z0-9.-]+$/.test(domain)) {
    return "Invalid email address";
  }

  if (!domain.includes(".")) {
    return "Invalid email address";
  }

  const domainParts = domain.split(".");
  if (domainParts.some((p) => p.length === 0)) {
    return "Invalid email address";
  }

  if (hasCommonTldTypo(trimmed)) {
    return commonTldTypoMessage;
  }

  return true;
};

export const isEmailCommonTypo = (email: string) => hasCommonTldTypo(email);

export const isValidEmail = (email: string) => validateEmailFormat(email) === true;
