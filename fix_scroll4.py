# Fix scroll - ensure proper heights
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace .main class
if '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 0; }' in content:
    print("Found exact match for .main")
    old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 0; }'
    new_main = '.main { overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
    content = content.replace(old_main, new_main)
    print("Changed .main to overflow: hidden")
elif '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }' in content:
    print("Found second match for .main")
    old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
    new_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 0; }'
    content = content.replace(old_main, new_main)
    print("Added height: 0 to .main")
else:
    print(".main not found in expected format")
    # Let's see what we have
    import re
    matches = re.findall(r'\.main\s*\{[^}]+\}', content)
    for m in matches:
        print(f"  Found: {m}")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
