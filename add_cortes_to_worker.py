# Add cortes API routes to worker index.ts
import os

index_path = r'E:\BeeHive\apps\worker\src\index.ts'
cortes_path = r'E:\BeeHive\apps\worker\src\cortes-api.ts'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already added
if "cortesRouter" in content:
    print("Cortes routes already added")
    exit(0)

# Find the app.listen line and add before it
lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    if line.strip().startswith('app.listen'):
        # Add cortes import and routes before app.listen
        new_lines.append("// Cortes API routes")
        new_lines.append("import cortesRouter from './cortes-api.js';")
        new_lines.append("app.use('/api/cortes', cortesRouter);")
        new_lines.append("")
    new_lines.append(line)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Added cortes routes to {index_path}")
print(f"Created cortes API: {cortes_path}")
