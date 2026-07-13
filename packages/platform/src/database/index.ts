/**
 * Database Layer do BeeHive — exports para o navegador (tipos apenas).
 *
 * O DatabaseManager usa Node.js nativo (better-sqlite3) e NÃO deve ser
 * importado no navegador. Use @beehive/platform/server para código Node.js.
 */
export type { } from './DatabaseManager';
export type { } from './DatabaseConversationMemory';