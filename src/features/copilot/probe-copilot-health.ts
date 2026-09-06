import { resolveTravelOsAiBaseUrl } from '@/services/ai-local-dev-contract';
import { getCachedAiEnabled } from '@/services/ai-preferences-cache';

export type CopilotHealthStatus =
  | 'ready'
  | 'unavailable'
  | 'checking'
  | 'disabled';

export type CopilotHealthSnapshot = {
  status: CopilotHealthStatus;
  baseUrl: string;
  toolsAvailable: string[];
  toolsNotConfigured: string[];
  detail: string;
};

type ToolsPayload = {
  ok?: boolean;
  configured?: Array<{ id?: string }>;
  tools?: Array<{
    id?: string;
    status?: string;
  }>;
};

/**
 * Probe the TravelOS AI proxy without mutating trip truth.
 * Honors the traveler kill-switch and allowed proxy URL policy.
 */
export async function probeCopilotHealth(
  signal?: AbortSignal,
): Promise<CopilotHealthSnapshot> {
  const baseUrl = resolveTravelOsAiBaseUrl(
    process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
  );

  if (!getCachedAiEnabled()) {
    return {
      status: 'disabled',
      baseUrl,
      toolsAvailable: [],
      toolsNotConfigured: [],
      detail:
        'TravelOS AI is off in Profile. Turn it on to use Chat and Copilot.',
    };
  }

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/ai/tools`,
      { method: 'GET', signal },
    );

    if (!response.ok) {
      return {
        status: 'unavailable',
        baseUrl,
        toolsAvailable: [],
        toolsNotConfigured: [],
        detail:
          'TravelOS AI is not reachable on this device.',
      };
    }

    const payload =
      (await response.json()) as ToolsPayload;

    const tools = Array.isArray(payload.tools)
      ? payload.tools
      : [];

    const toolsAvailable = tools
      .filter((tool) => tool.status === 'available')
      .map((tool) => tool.id)
      .filter((id): id is string => typeof id === 'string');

    const toolsNotConfigured = tools
      .filter(
        (tool) => tool.status === 'not_configured',
      )
      .map((tool) => tool.id)
      .filter((id): id is string => typeof id === 'string');

    return {
      status: 'ready',
      baseUrl,
      toolsAvailable,
      toolsNotConfigured,
      detail:
        'TravelOS AI ready. Suggestions never write trip truth without confirm.',
    };
  } catch {
    return {
      status: 'unavailable',
      baseUrl,
      toolsAvailable: [],
      toolsNotConfigured: [],
      detail:
        'TravelOS AI is unavailable. Plan and Discover still work without it.',
    };
  }
}
