# Fix OAuth callback to also create corte social account
import re

index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the callback section
old_pattern = r'pendingStates\.delete\(state\);\s*const frontendUrl = process\.env\.FRONTEND_URL \|\| \'https://beehiveos\.vercel\.app\';\s*const returnUri = `\$\{frontendUrl\}/negocios\?connected=\$\{platform\}&accountId=\$\{encodeURIComponent\(r\.accountId\)\}&displayName=\$\{encodeURIComponent\(r\.displayName \|\| \'\'\)\}`;\s*res\.redirect\(returnUri\);'

new_code = '''pendingStates.delete(state);
      
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
        });
      } catch (e) {
        console.error('Erro ao criar conta na API de cortes:', e);
      }
      
      // Redirecionar de volta para o frontend com os dados
      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}&channelId=${encodeURIComponent(state || '')}`;
      res.redirect(returnUri);'''

new_content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

if new_content != content:
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed OAuth callback!")
else:
    print("Pattern not found, trying alternative...")
    # Try simpler replacement
    if 'pendingStates.delete(state);' in content:
        content = content.replace(
            'pendingStates.delete(state);\n            const frontendUrl = process.env.FRONTEND_URL || \'https://beehiveos.vercel.app\';\n            const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || \'\'})`;\n            res.redirect(returnUri);',
            '''pendingStates.delete(state);
            
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
              });
            } catch (e) {
              console.error('Erro ao criar conta na API de cortes:', e);
            }
            
            // Redirecionar de volta para o frontend com os dados
            const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
            const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}&channelId=${encodeURIComponent(state || '')}`;
            res.redirect(returnUri);'''
        )
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed with alternative pattern!")
    else:
        print("Could not find pattern")

print("\nDone!")
