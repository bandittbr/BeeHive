import type { OAuthClientProvider, OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

const STORAGE_PREFIX = "beehive-mcp-oauth-";

function storageKey(connectionId: string, suffix: string): string {
  return `${STORAGE_PREFIX}${connectionId}:${suffix}`;
}

function loadJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function saveJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

export type McpOAuthProviderOptions = {
  connectionId: string;
  serverUrl: string;
  clientName?: string;
};

export class McpOAuthProvider implements OAuthClientProvider {
  private readonly connectionId: string;
  private readonly serverUrl: string;
  private readonly clientName: string;
  private _authorizeUrl: string | null = null;

  constructor(options: McpOAuthProviderOptions) {
    this.connectionId = options.connectionId;
    this.serverUrl = options.serverUrl;
    this.clientName = options.clientName ?? "BeeHive";
  }

  get redirectUrl(): string | URL {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
    return `${origin}/mcp/callback`;
  }

  get clientMetadata() {
    return {
      redirect_uris: [String(this.redirectUrl)],
      client_name: this.clientName,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none" as const,
    };
  }

  state(): string {
    return `state-${this.connectionId}-${Date.now()}`;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    return loadJson<OAuthClientInformationMixed>(
      storageKey(this.connectionId, "client")
    );
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    saveJson(storageKey(this.connectionId, "client"), clientInformation);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return loadJson<OAuthTokens>(
      storageKey(this.connectionId, "tokens")
    );
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    saveJson(storageKey(this.connectionId, "tokens"), tokens);
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this._authorizeUrl = authorizationUrl.toString();
  }

  get authorizeUrl(): string | null {
    return this._authorizeUrl;
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    saveJson(storageKey(this.connectionId, "verifier"), codeVerifier);
  }

  async codeVerifier(): Promise<string> {
    const verifier = loadJson<string>(
      storageKey(this.connectionId, "verifier")
    );
    if (!verifier) {
      throw new Error("No code verifier found. The OAuth flow may have been interrupted.");
    }
    return verifier;
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): Promise<void> {
    if (scope === "all" || scope === "client") {
      remove(storageKey(this.connectionId, "client"));
    }
    if (scope === "all" || scope === "tokens") {
      remove(storageKey(this.connectionId, "tokens"));
    }
    if (scope === "all" || scope === "verifier") {
      remove(storageKey(this.connectionId, "verifier"));
    }
    if (scope === "all" || scope === "discovery") {
      remove(storageKey(this.connectionId, "discovery"));
    }
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    saveJson(storageKey(this.connectionId, "discovery"), state);
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return loadJson<OAuthDiscoveryState>(
      storageKey(this.connectionId, "discovery")
    );
  }
}

export function clearAllOAuthData(connectionId: string): void {
  const keys = ["client", "tokens", "verifier", "discovery"];
  for (const suffix of keys) {
    remove(storageKey(connectionId, suffix));
  }
}
