import type { Credentials } from "./creds";
import { formatTimeUntil } from "./helpers";

export interface openaiQuota {
  accountEmail: string;
  accountId: string;
  accountType: string;
  allowed: boolean;
  limitReached: boolean;
  primaryUsedPercent: number;
  primaryRemainingPercent: number;
  primaryLimitWindowSeconds: number;
  primaryResetAfterSeconds: number;
  primaryResetAt: string;
  primaryResetIn: string;
  secondaryUsedPercent: number | null;
  secondaryRemainingPercent: number | null;
  secondaryLimitWindowSeconds: number | null;
  secondaryResetAfterSeconds: number | null;
  secondaryResetAt: string | null;
  secondaryResetIn: string | null;
}

interface openaiQuotaRawResponse {
  user_id: string;
  account_id: string;
  email: string;
  plan_type: string;
  rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: {
      used_percent: number;
      limit_window_seconds: number;
      reset_after_seconds: number;
      reset_at: number;
    };
    secondary_window: {
      used_percent: number;
      limit_window_seconds: number;
      reset_after_seconds: number;
      reset_at: number;
    } | null;
  };
  code_review_rate_limit: unknown;
  additional_rate_limits: unknown;
  credits: unknown;
  promo: unknown;
}

export async function getOpenaiQuota(creds: Credentials): Promise<openaiQuota> {
  if (!creds.openaiApiKey) {
    throw new Error("Missing OpenAI API key in credentials.");
  }

  const headers = new Headers();
  headers.append("Authorization", `Bearer ${creds.openaiApiKey}`);
  headers.append("User-Agent", "OpenCode-Quota-Plugin/1.0");
  if (creds.openaiAccountId) {
    headers.append("ChatGPT-Account-Id", creds.openaiAccountId);
  }

  const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    method: "GET",
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch OpenAI quota. Status: ${response.status}, Response: ${errorText}`,
    );
  }

  const result = (await response.json()) as openaiQuotaRawResponse;

  const primary = result.rate_limit.primary_window;
  const primaryUsedPercent = clampPercent(primary.used_percent);
  const primaryResetAt = unixSecondsToIso(primary.reset_at);
  const secondary = result.rate_limit.secondary_window;
  const secondaryUsedPercent =
    secondary === null ? null : clampPercent(secondary.used_percent);
  const secondaryResetAt =
    secondary === null ? null : unixSecondsToIso(secondary.reset_at);

  return {
    accountEmail: result.email,
    accountId: result.account_id,
    accountType: result.plan_type,
    allowed: result.rate_limit.allowed,
    limitReached: result.rate_limit.limit_reached,
    primaryUsedPercent: primaryUsedPercent,
    primaryRemainingPercent: clampPercent(100 - primaryUsedPercent),
    primaryLimitWindowSeconds: Math.max(0, primary.limit_window_seconds),
    primaryResetAfterSeconds: Math.max(0, primary.reset_after_seconds),
    primaryResetAt: primaryResetAt,
    primaryResetIn: formatTimeUntil(primaryResetAt),
    secondaryUsedPercent: secondaryUsedPercent,
    secondaryRemainingPercent:
      secondaryUsedPercent === null
        ? null
        : clampPercent(100 - secondaryUsedPercent),
    secondaryLimitWindowSeconds:
      secondary === null ? null : Math.max(0, secondary.limit_window_seconds),
    secondaryResetAfterSeconds:
      secondary === null ? null : Math.max(0, secondary.reset_after_seconds),
    secondaryResetAt: secondaryResetAt,
    secondaryResetIn:
      secondaryResetAt === null ? null : formatTimeUntil(secondaryResetAt),
  };
}

function unixSecondsToIso(value: number): string {
  if (!Number.isFinite(value)) {
    return "unknown";
  }

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString();
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}
