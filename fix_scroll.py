# Fix scroll issue in App.css
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already fixed
if '.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; overflow: auto; }' in content:
    print("Already fixed!")
    exit(0)

# Replace the app and app-body classes
old_app = '.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; }'
new_app = '.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh; overflow: auto; }'

old_app_body = '.app-body { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }'
new_app_body = '.app-body { display: flex; flex-direction: column; overflow: auto; min-width: 0; }'

content = content.replace(old_app, new_app)
content = content.replace(old_app_body, new_app_body)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
print("Old .app:", old_app)
print("New .app:", new_app)
print("Old .app-body:", old_app_body)
print("New .app-body:", new_app_body)
