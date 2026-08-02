# Fix OAuth callback to create corte social account
index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact text to replace
old_text = '''      pendingStates.delete(state);
      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}`;
      res.redirect(returnUri);'''

new_text = '''      pendingStates.delete(state);
      
      // TAMÉM criar na API de cortes (para o frontend mostrar)
      try {
        const corteApiUrl = `${PUBLIC_URL}/api/cortes/social-accounts`;
        await fetch(corteApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            accountId: r.accountId,
            displayName: r.displayName,
            channelId: state || undefined,
          }),
        }).catch(e => console.error('Erro ao criar conta na API de cortes:', e));
      } catch (e) {
        console.error('Erro ao criar conta na API de cortes:', e);
      }
      
      // Redirecionar de volta para o frontend com os dados
      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}&channelId=${encodeURIComponent(state || '')}`;
      res.redirect(returnUri);'''

if old_text in content:
    content = content.replace(old_text, new_text)
    print("✅ Fixed OAuth callback!")
else:
    print("❌ Pattern not found")
    # Try to find similar text
    if 'pendingStates.delete(state)' in content:
        print("Found pendingStates.delete(state), showing context:")
        idx = content.find('pendingStates.delete(state)')
        print(content[idx:idx+400])

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFile saved!")
