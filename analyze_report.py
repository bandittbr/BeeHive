import os

def count_files(root_dir, ext=None):
    count = 0
    total_lines = 0
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in root:
            continue
        for f in files:
            if ext and not f.endswith(ext):
                continue
            count += 1
            try:
                with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fp:
                    total_lines += len(fp.readlines())
            except:
                pass
    return count, total_lines

paths_to_check = {
    'kernel': 'E:/BeeHive/kernel',
    'plugins': 'E:/BeeHive/plugins',
    'packages': 'E:/BeeHive/packages',
    'ui': 'E:/BeeHive/ui',
    'tests': 'E:/BeeHive/tests',
    'shared': 'E:/BeeHive/shared',
    'examples': 'E:/BeeHive/examples',
    'services': 'E:/BeeHive/services',
    'pipeline': 'E:/BeeHive/pipeline',
}

print("=" * 60)
print("ESTATÍSTICAS DO CÓDIGO BEEHIVE")
print("=" * 60)
for name, path in paths_to_check.items():
    if os.path.exists(path):
        files, lines = count_files(path)
        print(f"{name}: {files} arquivos, ~{lines} linhas")
    else:
        print(f"{name}: CAMINHO NÃO EXISTENTE")

plugin_dir = 'E:/BeeHive/plugins'
plugins = [d for d in os.listdir(plugin_dir) if os.path.isdir(os.path.join(plugin_dir,d)) and d != 'README.md']
print(f"\nPlugins encontrados ({len(plugins)}): {', '.join(plugins)}")

providers_dir = 'E:/BeeHive/providers'
if os.path.exists(providers_dir):
    providers = [d for d in os.listdir(providers_dir) if os.path.isdir(os.path.join(providers_dir,d))]
    print(f"Provedores: {providers if providers else 'nenhum'}")
else:
    print("Provedores: diretório inexistente")

# Count test files
test_dir = 'E:/BeeHive/tests/architecture'
if os.path.exists(test_dir):
    tests = [f for f in os.listdir(test_dir) if f.endswith('.ts')]
    print(f"\nTestes de arquitetura: {tests}")