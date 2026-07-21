"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { McpOAuthProvider } from "@/services/mcp-oauth-provider";

export function McpCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authorization...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authorization failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization code or state parameter.");
      return;
    }

    const processCallback = async () => {
      try {
        // Extract connectionId from state (format: "state-{connectionId}-{timestamp}")
        const stateParts = state.split("-");
        if (stateParts.length < 3 || stateParts[0] !== "state") {
          throw new Error("Invalid state parameter format.");
        }
        const connectionId = stateParts.slice(1, -1).join("-");

        // Get the server URL from localStorage
        const configKey = `beehive-mcp-oauth-${connectionId}:discovery`;
        const discoveryRaw = localStorage.getItem(configKey);
        let serverUrl = "";

        if (discoveryRaw) {
          const discovery = JSON.parse(discoveryRaw);
          serverUrl = discovery?.issuer ?? "";
        }

        if (!serverUrl) {
          // Try to find the server URL from the MCP servers list
          const serversKey = "beehive-mcp-servers";
          const serversRaw = localStorage.getItem(serversKey);
          if (serversRaw) {
            const servers = JSON.parse(serversRaw);
            const server = servers?.state?.servers?.find(
              (s: any) => s.config?.id === connectionId
            );
            if (server) {
              serverUrl = server.config?.serverUrl ?? "";
            }
          }
        }

        if (!serverUrl) {
          throw new Error("Could not determine server URL for this connection.");
        }

        // Exchange the authorization code for tokens using the MCP SDK
        const { auth } = await import("@modelcontextprotocol/sdk/client/auth.js");
        const provider = new McpOAuthProvider({
          connectionId,
          serverUrl,
        });

        // The SDK's auth() function handles the token exchange
        // When called with the authorization code in the URL, it will:
        // 1. Exchange the code for tokens
        // 2. Save the tokens via the provider
        const result = await auth(provider, {
          serverUrl,
          authorizationCode: code,
          state,
        });

        if (result === "AUTHORIZED") {
          setStatus("success");
          setMessage("Authorization successful! You can close this window.");

          // Close the popup after a short delay
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              // If not a popup, redirect to settings
              window.location.href = "/?view=settings";
            }
          }, 2000);
        } else {
          throw new Error("Authorization was not completed.");
        }
      } catch (err) {
        console.error("MCP OAuth callback error:", err);
        setStatus("error");
        setMessage(
          err instanceof Error
            ? `Authorization failed: ${err.message}`
            : "An unexpected error occurred during authorization."
        );
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full mx-4 p-6 rounded-xl border border-border bg-card shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="size-10 text-primary animate-spin" />
              <h1 className="text-lg font-medium">Authorizing...</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="size-10 text-green-500" />
              <h1 className="text-lg font-medium">Authorized!</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="size-10 text-red-500" />
              <h1 className="text-lg font-medium">Authorization Failed</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <button
                onClick={() => window.history.back()}
                className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
