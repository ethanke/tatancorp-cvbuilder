export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) { return JSON.parse(fenced[1].trim()); }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1) { return JSON.parse(trimmed.slice(start, end + 1)); }
    throw new SyntaxError("No JSON found in model response");
  }
}
