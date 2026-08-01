# -*- coding: utf-8 -*-
import os

app_store_path = r'E:\BeeHive\apps\control-center\src\stores\appStore.ts'

with open(app_store_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'CorteChannel' in content:
    print('Already has CorteChannel types')
    exit(0)

# Add import after the types import
new_import = "import type { CorteChannel, CorteSocialAccount, CorteProject, CorteClip, CorteSettings } from '../types/cortes';"
if new_import not in content:
    content = content.replace(
        "SocialAccount } from '../types';",
        "SocialAccount } from '../types';\n" + new_import
    )

# Define the corte store section to add
corte_section_lines = [
    '',
    '  // Cortes',
    '  corteChannels: [] as CorteChannel[],',
    '  corteSocialAccounts: [] as CorteSocialAccount[],',
    '  corteProjects: [] as CorteProject[],',
    '  corteSettings: null as CorteSettings | null,',
    '  addCorteChannel: (ch) => set((s) => ({ corteChannels: [...s.corteChannels, ch] })),',
    '  updateCorteChannel: (id, updates) => set((s) => ({',
    "    corteChannels: s.corteChannels.map(channel => channel.id === id ? { ...channel, ...updates } : channel),",
    '  })),',
    '  deleteCorteChannel: (id) => set((s) => ({',
    "    corteChannels: s.corteChannels.filter(channel => channel.id !== id),",
    '  })),',
    "  addCorteSocialAccount: (sa) => set((s) => ({ corteSocialAccounts: [...s.corteSocialAccounts, sa] }))," ,
    '  deleteCorteSocialAccount: (id) => set((s) => ({',
    "    corteSocialAccounts: s.corteSocialAccounts.filter(sa => sa.id !== id),",
    '  })),',
    '  addCorteProject: (p) => set((s) => ({ corteProjects: [p, ...s.corteProjects] })),',
    '  updateCorteProject: (id, updates) => set((s) => ({',
    "    corteProjects: s.corteProjects.map(project => project.id === id ? { ...project, ...updates } : project),",
    '  })),',
    '  deleteCorteProject: (id) => set((s) => ({',
    "    corteProjects: s.corteProjects.filter(project => project.id !== id),",
    '  })),',
    '  setCorteSettings: (settings) => set((s) => ({ corteSettings: settings ?? s.corteSettings })),',
]

corte_section = '\n'.join(corte_section_lines)

# Find the end of the file and insert before the closing });
content = content.rstrip()
if content.endswith('}));'):
    content = content[:-4] + corte_section + '\n}));'
else:
    # Try another approach - replace the last occurrence of removeSocialAccount block
    content = content.replace(
        "removeSocialAccount: (bizId, socialId) => set((s) => ({\n    bizAccounts: s.bizAccounts.map(b => b.id === bizId ? { ...b, socialAccounts: b.socialAccounts.filter(sa => sa.id !== socialId) } : b),\n  })),\n}));",
        f"removeSocialAccount: (bizId, socialId) => set((s) => ({{\n    bizAccounts: s.bizAccounts.map(b => b.id === bizId ? {{ ...b, socialAccounts: b.socialAccounts.filter(sa => sa.id !== socialId) }} : b),\n  }})),\n{corte_section}\n}}));"
    )

with open(app_store_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done updating appStore.ts')
print('CorteChannel' in content)
