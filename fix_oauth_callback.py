# Fix OAuth callback to redirect back to frontend
index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the callback section and add redirect to frontend
old_callback = '''      await upsertAccount({
        id, platform, accountId: r.accountId, displayName: r.displayName,
        accessToken: r.accessToken, refreshToken: r.refreshToken,
        expiresAt: r.expiresIn ? Date.now() + r.expiresIn * 1000 : undefined,
      });
      res.send(page('Conectado!', `Conta ${platform} conectada com sucesso!`, redirectUri));'''

new_callback = '''      await upsertAccount({
        id, platform, accountId: r.accountId, displayName: r.displayName,
        accessToken: r.accessToken, refreshToken: r.refreshToken,
        expiresAt: r.expiresIn ? Date.now() + r.expiresIn * 1000 : undefined,
      });
      
      // Redirect back to frontend with account info
      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}`;
      res.redirect(returnUri);'''

if old_callback in content:
    content = content.replace(old_callback, new_callback)
    print("Updated callback redirect")
else:
    # Try alternative - just find the upsertAccount line
    if 'await upsertAccount({' in content:
        import re
        # Find and replace the callback response
        pattern = r'(await upsertAccount\(\{[^}]+\}\);)\s*(res\.send\(page\()'
        replacement = r'\1\n      \n      // Redirect back to frontend\n      const frontendUrl = process.env.FRONTEND_URL || \'https://beehiveos.vercel.app\';\n      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || \'\'})`;\n      res.redirect(returnUri);'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        print("Updated via regex")
    else:
        print("Could not find callback pattern")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
