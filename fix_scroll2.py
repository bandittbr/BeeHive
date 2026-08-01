# Fix html/body overflow issue
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already fixed
if 'html, body, #root { height: 100%; overflow: auto; }' in content:
    print("Already fixed!")
    exit(0)

# Replace the problematic line
old_line = 'html, body, #root { height: 100%; overflow: hidden; }'
new_line = 'html, body, #root { height: 100%; overflow: auto; }'

content = content.replace(old_line, new_line)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
print("Old:", old_line)
print("New:", new_line)
