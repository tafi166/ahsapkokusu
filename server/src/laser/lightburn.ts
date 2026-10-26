/** Future connector boundary. There is intentionally no network implementation or arbitrary URL proxy. */
export interface LightBurnProjectExchange {
  capabilities(): Promise<{
    version: string;
    projectRead: boolean;
    importWithConsent: boolean;
  }>;
  readProject(operatorId: string): Promise<unknown>;
  importWithConsent(input: {
    designId: string;
    operatorId: string;
    consentId: string;
    expectedProjectRevision: string;
  }): Promise<void>;
}
export const LIGHTBURN_CONNECTOR_ENABLED = false;
