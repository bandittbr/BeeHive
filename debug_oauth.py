# Simple fix for OAuth callback
index_path = r'E:\BeeHive\apps\worker\src\index.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Just check what we have
if 'pendingStates.delete(state)' in content:
    print("Found pendingStates.delete(state)")
    # Find the next few lines
    idx = content.find('pendingStates.delete(state)')
    print(content[idx:idx+500])
else:
    print("Not found")
