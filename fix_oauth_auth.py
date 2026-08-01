# Fix OAuth auth bypass
index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the OAuth start endpoint to bypass auth check
old_code = """app.get('/oauth/:platform/start', async (req, res) => {
    const q = typeof req.query.t === 'string' ? req.query.t : '';
    if (AUTH_TOKEN && q !== AUTH_TOKEN) return res.status(401).send('unauthorized');"""

new_code = """// OAuth endpoints do NOT require auth token - they are public flows
app.get('/oauth/:platform/start', async (req, res) => {
    // Bypass auth token check for OAuth flows"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Fixed OAuth start endpoint")
else:
    print("Pattern not found, checking...")
    # Try to find and fix manually
    if "if (AUTH_TOKEN && q !== AUTH_TOKEN) return res.status(401)" in content:
        content = content.replace(
            "if (AUTH_TOKEN && q !== AUTH_TOKEN) return res.status(401).send('unauthorized');",
            "// OAuth bypasses auth token check"
        )
        print("Fixed auth check line")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
