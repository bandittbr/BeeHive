export type ToolErrorAttribution = {
  label: string;
  confidence: "Confirmed" | "Inferred";
  description: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResultRecord(result: unknown): Record<string, unknown> | null {
  if (isRecord(result)) return result;
  if (typeof result !== "string") return null;

  const trimmed = result.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  const candidates = [
    trimmed,
    ...(jsonStart > 0 ? [trimmed.slice(jsonStart)] : []),
    ...(jsonStart >= 0 && jsonEnd > jsonStart ? [trimmed.slice(jsonStart, jsonEnd + 1)] : []),
  ];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

function diagnosticFromError(errorText: string): Record<string, unknown> | null {
  const parsed = parseResultRecord(errorText);
  if (!parsed) return null;
  return isRecord(parsed.diagnostic) ? parsed.diagnostic : parsed;
}

function stringValue(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(record: Record<string, unknown> | null, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function confirmed(label: string, description: string): ToolErrorAttribution {
  return { label, confidence: "Confirmed", description };
}

export function attributeChatToolError(errorText: string): ToolErrorAttribution | null {
  const diagnostic = diagnosticFromError(errorText);
  const code = stringValue(diagnostic, "code");
  const category = stringValue(diagnostic, "category");
  const httpStatus = numberValue(diagnostic, "httpStatus");

  if (
    errorText.includes("timed out") ||
    code === "MCP_LIFECYCLE_DEADLINE" ||
    code === "MCP_REQUEST_TIMEOUT" ||
    category === "lifecycle_deadline"
  ) {
    return confirmed(
      "Timeout",
      "The operation timed out. The external operation may still have completed."
    );
  }

  if (
    category === "security_blocked" ||
    code === "MCP_URL_BLOCKED"
  ) {
    return confirmed("Blocked", "The request was blocked before it was sent.");
  }

  if (httpStatus !== undefined && (httpStatus < 200 || httpStatus >= 300)) {
    return confirmed(
      `HTTP ${httpStatus}`,
      `The remote server returned HTTP ${httpStatus}.`
    );
  }

  if (/\b(?:timed out|timeout|deadline exceeded)\b/i.test(errorText)) {
    return {
      label: "Timeout",
      confidence: "Inferred",
      description: "A timeout was reported.",
    };
  }

  return null;
}
