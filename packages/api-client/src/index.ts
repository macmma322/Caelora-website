export interface PlatformInfoV1 {
  contractVersion: '1';
  stage: 'foundation';
  accountsAvailable: boolean;
  purchasesAvailable: boolean;
  launcherAvailable: boolean;
}

// This milestone implements only public capabilities. This client never stores credentials.
export async function getPlatformInfo(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<PlatformInfoV1> {
  const response = await fetcher(new URL('/api/v1/platform', apiBaseUrl), {
    signal: AbortSignal.timeout(5000),
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Platform information is unavailable.');
  const value: unknown = await response.json();
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
    throw new Error('Unsupported platform response contract.');
  }
  return {
    contractVersion: '1',
    stage: 'foundation',
    accountsAvailable: value.accountsAvailable,
    purchasesAvailable: value.purchasesAvailable,
    launcherAvailable: value.launcherAvailable,
  };
}
