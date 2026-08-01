# Fix OAuth callback redirect
import re

index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already fixed
if 'const frontendUrl = process.env.FRONTEND_URL' in content:
    print("Already fixed!")
    exit(0)

# Replace the old response with redirect
old_pattern = r"res\.send\(page\('Conta conectada', `\$\{r\.displayName \|\| r\.accountId\} conectada com sucesso\.`\)\);"
new_code = """      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}`;
      res.redirect(returnUri);"""

new_content = re.sub(old_pattern, new_code, content)

if new_content != content:
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed OAuth callback redirect!")
else:
    print("Pattern not found, trying alternative...")
    # Try simpler pattern
    if "res.send(page('Conta conectada'" in content:
        content = content.replace(
            "res.send(page('Conta conectada', `${r.displayName || r.accountId} conectada com sucesso.`));",
            """      const frontendUrl = process.env.FRONTEND_URL || 'https://beehiveos.vercel.app';
      const returnUri = `${frontendUrl}/negocios?connected=${platform}&accountId=${encodeURIComponent(r.accountId)}&displayName=${encodeURIComponent(r.displayName || '')}`;
      res.redirect(returnUri);"""
        )
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed with alternative pattern!")

print("\nDone!")
