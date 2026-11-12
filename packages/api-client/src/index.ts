export interface PlatformInfoV1 {
  contractVersion: '1';
  stage: 'foundation';
  accountsAvailable: boolean;
  purchasesAvailable: boolean;
  launcherAvailable: boolean;
}

/**
 * Why platform information could not be read.
 * - `absent`: an origin answered, but no v1 platform API is there (404, non-JSON, foreign contract).
 * - `unreachable`: the platform may exist but did not answer usefully (network, CORS, timeout,
 *   5xx, 429). Callers should treat this as temporary, not as "closed".
 */
export class PlatformInfoError extends Error {
  readonly reason: 'absent' | 'unreachable';
  constructor(message: string, reason: 'absent' | 'unreachable') {
    super(message);
    this.reason = reason;
  }
}

// This milestone implements only public capabilities. This client never stores credentials.
export async function getPlatformInfo(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<PlatformInfoV1> {
  let response: Response;
  try {
    response = await fetcher(new URL('/api/v1/platform', apiBaseUrl), {
      signal: AbortSignal.timeout(5000),
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new PlatformInfoError('The platform could not be reached.', 'unreachable');
  }
  if (!response.ok)
    throw new PlatformInfoError(
      'Platform information is unavailable.',
      response.status === 404 ? 'absent' : 'unreachable',
    );
  const value: unknown = await response.json().catch(() => {
    throw new PlatformInfoError('Platform information is not JSON.', 'absent');
  });
  if (
    typeof value !== 'object' ||
    value === null ||
    !('contractVersion' in value) ||
    value.contractVersion !== '1' ||
    !('stage' in value) ||
    value.stage !== 'foundation' ||
    !('accountsAvailable' in value) ||
    typeof value.accountsAvailable !== 'boolean' ||
    !('purchasesAvailable' in value) ||
    typeof value.purchasesAvailable !== 'boolean' ||
    !('launcherAvailable' in value) ||
    typeof value.launcherAvailable !== 'boolean'
  ) {
    throw new PlatformInfoError('Unsupported platform response contract.', 'absent');
  }
  return {
    contractVersion: '1',
    stage: 'foundation',
    accountsAvailable: value.accountsAvailable,
    purchasesAvailable: value.purchasesAvailable,
    launcherAvailable: value.launcherAvailable,
  };
}
