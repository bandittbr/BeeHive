/**
 * Database Layer do BeeHive — ponto único de importação.
 *
 * Expõe o DatabaseManager (gestão do SQLite) e o DatabaseConversationMemory
 * (implementação persistente de IConversationMemory).
 */
export { DatabaseManager, type DatabaseManagerOptions } from './DatabaseManager';
export { DatabaseConversationMemory } from './DatabaseConversationMemory';