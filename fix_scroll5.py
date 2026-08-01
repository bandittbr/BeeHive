# Fix scroll properly
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove overflow from app-body to let flex handle it
old_app_body = '.app-body { display: flex; flex-direction: column; overflow: auto; min-width: 0; }'
new_app_body = '.app-body { display: flex; flex-direction: column; min-width: 0; }'

if old_app_body in content:
    content = content.replace(old_app_body, new_app_body)
    print("Removed overflow from .app-body")
else:
    print(".app-body not found")

# Fix .main - let it use flex naturally
old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 0; }'
new_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'

if old_main in content:
    content = content.replace(old_main, new_main)
    print("Fixed .main (removed height: 0)")
else:
    # Try alternative
    old_main2 = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
    new_main2 = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
    if old_main2 in content:
        content = content.replace(old_main2, new_main2)
        print(".main already correct")
    else:
        print(".main format changed, skipping")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
