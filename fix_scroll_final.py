# Fix scroll structure properly
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix app-body - remove overflow hidden, let it flow naturally
old_app_body = '.app-body { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-width: 0; }'
new_app_body = '.app-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }'
content = content.replace(old_app_body, new_app_body)

# Ensure main has proper overflow
old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
new_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; }'
content = content.replace(old_main, new_main)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed scroll structure!')
print('app-body: removed overflow: hidden')
print('main: added height: 100%')
