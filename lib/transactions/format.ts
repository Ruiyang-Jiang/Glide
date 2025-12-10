export function sanitizeTransactionDescription(description?: string | null): string {
  if (!description) return "-";
  // Remove script/style blocks entirely, then strip remaining HTML tags
  const withoutScripts = description.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const stripped = withoutScripts.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 0 ? stripped : "-";
}
