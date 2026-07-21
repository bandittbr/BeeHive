export type ProviderIconProps = {
  providerId?: string | null;
  providerName?: string | null;
  className?: string;
  size?: number;
};

export function ProviderIcon(props: ProviderIconProps) {
  const size = props.size ?? 16;
  const normalizedId = props.providerId?.trim().toLowerCase() ?? "";
  const normalizedName = props.providerName?.trim().toLowerCase() ?? "";
  const hasProviderFamily = (family: string) =>
    normalizedId === family || normalizedName.includes(family);

  const isAnthropic = hasProviderFamily("anthropic");
  const isOpenAI = hasProviderFamily("openai");
  const isOpenCode = hasProviderFamily("opencode");
  const isOpenRouter = hasProviderFamily("openrouter");
  const isGoogle = hasProviderFamily("google");
  const isOllama = hasProviderFamily("ollama");
  const isDeepSeek = hasProviderFamily("deepseek");

  const fallbackLetters = (() => {
    if (isOpenRouter) return "OR";
    if (isDeepSeek) return "DS";
    if (isGoogle) return "GO";
    if (isOllama) return "OL";
    if (normalizedId.length >= 2) return normalizedId.substring(0, 2).toUpperCase();
    return "AI";
  })();

  const colorClass = (() => {
    if (isOpenAI) return "bg-black text-white";
    if (isAnthropic) return "bg-orange-600 text-white";
    if (isOpenCode) return "bg-blue-600 text-white";
    if (isOpenRouter) return "bg-purple-600 text-white";
    if (isGoogle) return "bg-blue-500 text-white";
    if (isOllama) return "bg-green-600 text-white";
    if (isDeepSeek) return "bg-cyan-600 text-white";
    return "bg-muted text-muted-foreground";
  })();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md ${colorClass} ${props.className ?? ""}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {isOpenAI ? (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width={size * 0.6} height={size * 0.6}>
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
      ) : isAnthropic ? (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width={size * 0.6} height={size * 0.6}>
          <path d="M13.803 4.5a.47.47 0 0 0-.413.243l-2.382 4.095-2.57-1.495a.47.47 0 0 0-.475-.015L4.92 8.715a.47.47 0 0 0-.236.407v8.167a.47.47 0 0 0 .694.414l3.216-1.757 2.57 1.495a.47.47 0 0 0 .475.015l3.043-1.77a.47.47 0 0 0 .236-.407V5.393a.47.47 0 0 0-.235-.407l-1.12-.486zm4.794 1.033a.47.47 0 0 0-.413.243l-2.382 4.095-2.57-1.495a.47.47 0 0 0-.475-.015l-3.043 1.77-.864-.375v8.167a.47.47 0 0 0 .694.414l3.216-1.757 2.57 1.495a.47.47 0 0 0 .475.015l3.043-1.77a.47.47 0 0 0 .236-.407V6.426a.47.47 0 0 0-.235-.407l-1.12-.486z" />
        </svg>
      ) : isOllama ? (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size * 0.6} height={size * 0.6}>
          <path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
          <path d="M6 10v1a6 6 0 0 0 12 0v-1" />
          <circle cx="9" cy="16" r="1" fill="currentColor" />
          <circle cx="15" cy="16" r="1" fill="currentColor" />
          <path d="M10 19c.5.5 1.5 1 2 1s1.5-.5 2-1" />
        </svg>
      ) : (
        <span className="font-bold tracking-tight" style={{ fontSize: `${Math.max(8, size * 0.45)}px` }}>
          {fallbackLetters}
        </span>
      )}
    </div>
  );
}
