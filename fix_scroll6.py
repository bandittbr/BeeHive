# Fix scroll properly - ensure proper height chain
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find current .main and update it
old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
new_main = '.main { overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }'

if old_main in content:
    content = content.replace(old_main, new_main)
    print("Changed .main to overflow: hidden")
else:
    # Try alternative
    import re
    matches = re.findall(r'\.main\s*\{[^}]+\}', content)
    print(f"Found {len(matches)} matches for .main:")
    for m in matches:
        print(f"  {m}")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
