# Fix mobile responsive styles
import os

css_path = r'E:\BeeHive\apps\control-center\src\components\cortes\cortes.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the mobile section
old_mobile_start = '''@media (max-width: 768px) {
  .cortes-main {
    padding: 12px;
    gap: 16px;
  }
  
  .cortes-page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .cortes-page-header h1 {
    font-size: 20px;
  }'''

new_mobile_start = '''@media (max-width: 768px) {
  /* CRITICAL: Allow natural flow on mobile - remove height constraints */
  .cortes-main {
    padding: 10px;
    gap: 10px;
    height: auto !important;
    overflow-y: visible !important;
    min-height: auto !important;
  }
  
  .cortes-page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 8px;
  }
  
  .cortes-page-header h1 {
    font-size: 16px;
    margin: 0;
  }
  
  .cortes-page-header p {
    font-size: 11px;
  }
  
  .cortes-page-header .btn-primary {
    align-self: flex-end;
    padding: 5px 10px;
    font-size: 11px;
  }'''

if old_mobile_start in content:
    content = content.replace(old_mobile_start, new_mobile_start)
    print("Updated mobile header styles")
else:
    print("Could not find exact match, trying alternative...")
    # Try without the exact spacing
    if '.cortes-main {' in content and 'padding: 12px;' in content:
        content = content.replace(
            '.cortes-main {\n    padding: 12px;\n    gap: 16px;\n  }',
            '''.cortes-main {
    padding: 10px;
    gap: 10px;
    height: auto !important;
    overflow-y: visible !important;
    min-height: auto !important;
  }'''
        )
        print("Updated .cortes-main mobile styles")
    else:
        print("Styles already updated or format different")

# Also update other mobile styles for compactness
replacements = [
    ('.cortes-tabs {', '.cortes-tabs {\n    gap: 2px;\n  }\n\n  @media (min-width: 769px) {\n    .cortes-tabs {'),
    ('.cortes-tab {', '.cortes-tab {\n    padding: 6px 10px;\n    font-size: 12px;\n  }'),
    ('.cortes-projects-grid {', '.cortes-projects-grid {\n    gap: 8px;\n  }'),
    ('.cortes-clips-grid {', '.cortes-clips-grid {\n    gap: 6px;\n  }'),
    ('.cortes-form-row {', '.cortes-form-row {\n    grid-template-columns: 1fr;\n    gap: 8px;\n  }'),
]

for old, new in replacements:
    if old in content and old not in new:
        content = content.replace(old, new)
        print(f"Updated: {old}")

# Add more mobile compact styles at the end of the media query
mobile_end = '''  .empty-state h3 {
    font-size: 14px;
  }
  
  .empty-state p {
    font-size: 11px;
  }
}

/* Small phones */
@media (max-width: 380px) {
  .cortes-main {
    padding: 8px;
    gap: 8px;
  }
  
  .cortes-page-header h1 {
    font-size: 14px;
  }
  
  .cortes-tab {
    padding: 5px 8px;
    font-size: 11px;
  }
}'''

# Check if we need to add these styles
if 'Small phones' not in content:
    # Find the closing brace of the first media query and add after it
    lines = content.split('\n')
    found_media = False
    insert_pos = -1
    
    for i, line in enumerate(lines):
        if '@media (max-width: 768px)' in line:
            found_media = True
        if found_media and line.strip() == '}' and i > 20:  # After some content
            insert_pos = i + 1
            break
    
    if insert_pos > 0:
        lines.insert(insert_pos, mobile_end)
        content = '\n'.join(lines)
        print("Added small phones media query")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! Mobile styles updated.")
