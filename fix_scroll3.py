# Fix scroll - add proper heights
import os

css_path = r'E:\BeeHive\apps\control-center\src\App.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find current main class
old_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; }'
new_main = '.main { overflow: auto; display: flex; flex-direction: column; flex: 1; min-height: 0; height: 0; }'

if old_main in content:
    content = content.replace(old_main, new_main)
    print("Updated .main to include height: 0")
else:
    print(".main not found or already updated")

# Update cortes-main to have explicit height handling
cortes_css_path = r'E:\BeeHive\apps\control-center\src\components\cortes\cortes.css'
with open(cortes_css_path, 'r', encoding='utf-8') as f:
    cortes_content = f.read()

old_cortes = '''.cortes-main {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  min-height: 0;
}'''

new_cortes = '''.cortes-main {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}'''

if old_cortes in cortes_content:
    cortes_content = cortes_content.replace(old_cortes, new_cortes)
    with open(cortes_css_path, 'w', encoding='utf-8') as f:
        f.write(cortes_content)
    print("Updated .cortes-main with height: 100% and touch scrolling")
else:
    print(".cortes-main not found or already updated")

print("\nDone!")
