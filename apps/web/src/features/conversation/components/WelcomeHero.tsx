/**
 * Bloco de boas-vindas da Conversa: ilustração da colmeia + título + slogan.
 * Conteúdo estático e puramente visual.
 */
export function WelcomeHero() {
  return (
    <div className="welcome-hero">
      <div className="welcome-hero__mark" aria-hidden>
        <svg viewBox="0 0 64 64" width={72} height={72} fill="none">
          <path
            d="M32 6 54 18.5v27L32 58 10 45.5v-27L32 6Z"
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path
            d="M32 20 43 26.5v13L32 46 21 39.5v-13L32 20Z"
            fill="var(--accent)"
          />
          <path
            d="M32 27v12M27 30.5l10 5M37 30.5l-10 5"
            stroke="#1a1b21"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="welcome-hero__title">
        Bem-vindo ao <span className="welcome-hero__accent">BeeHive</span>
      </h2>
      <p className="welcome-hero__slogan">Converse. Crie. Automatize. Cresça.</p>
    </div>
  );
}
