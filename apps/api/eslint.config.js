import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Configuração de lint (flat config) do backend Express.
export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      // Advertir variável declarada mas não usada (exceto prefixo _)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Preferir Promise<void> a Promise<any>
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
