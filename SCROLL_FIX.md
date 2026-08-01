# Correção de Scroll - BeeHive Cortes

## Problema
O usuário não conseguia rolar a página para baixo na seção de Negócios > Cortes, especialmente em mobile e telas pequenas.

## Causa
A chain de containers estava travando o scroll:
1. `.app` tinha `height: 100vh` sem overflow
2. `.app-body` tinha `overflow: hidden`
3. `.cortes-main` tinha `height: 100%` fixo

## Correções Aplicadas

### 1. App.css
```css
/* Antes */
.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; }
.app-body { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* Depois */
.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; overflow: auto; }
.app-body { display: flex; flex-direction: column; overflow: auto; min-width: 0; }
```

### 2. cortes.css
```css
/* Antes */
.cortes-main {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;  /* TRAVAVA O SCROLL */
  overflow-y: auto;
  ...
}

/* Depois */
.cortes-main {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  overflow-y: auto;  /* REMOVIDO height fixo */
  ...
}
```

## Como Testar

1. Acesse: https://beehiveos.vercel.app/negocios
2. Clique em "Canais & Redes"
3. Adicione vários canais (5-10)
4. Role a página para baixo - agora deve funcionar!

## Mobile
No celular, o conteúdo agora:
- Permite scroll vertical normalmente
- Ajusta layouts automaticamente
- Modal de "Novo Projeto" também permite scroll interno

---
Commit: d675970
