export const validatePassword = (value: string) => {
  const pwd = value.trim();
  const issues: string[] = [];
  if (pwd.length < 12) issues.push("at least 12 characters");
  if (!/[a-z]/.test(pwd)) issues.push("a lowercase letter");
  if (!/[A-Z]/.test(pwd)) issues.push("an uppercase letter");
  if (!/\d/.test(pwd)) issues.push("a number");
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\\[\];']/g.test(pwd)) issues.push("a symbol");

  if (issues.length > 0) {
    return `Password must include ${issues.join(", ")}`;
  }
  return true;
};
