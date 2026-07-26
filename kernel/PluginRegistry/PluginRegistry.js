"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRegistry = void 0;
class PluginRegistry {
    kernel;
    plugins = new Map();
    constructor(kernel) {
        this.kernel = kernel;
    }
    async discoverAndActivate() {
        const results = [];
        const fs = await import('fs');
        const path = await import('path');
        const pluginsDir = path.join(process.cwd(), 'plugins');
        if (!fs.existsSync(pluginsDir))
            return results;
        const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
        const pluginDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
        for (const dirName of pluginDirs) {
            const manifestPath = path.join(pluginsDir, dirName, 'src', 'manifest.yaml');
            if (!fs.existsSync(manifestPath))
                continue;
            try {
                const yamlRaw = fs.readFileSync(manifestPath, 'utf-8');
                const diskManifest = this.parseYaml(yamlRaw);
                const pluginManifest = {
                    name: diskManifest.name,
                    version: diskManifest.version,
                    description: diskManifest.description,
                    author: diskManifest.author,
                    capabilities: diskManifest.capabilities.map((c) => c.id),
                    adapters: diskManifest.adapters ?? [],
                    permissions: diskManifest.permissions ?? [],
                };
                const pluginPath = path.join(pluginsDir, dirName, 'src', 'plugin.ts');
                const pluginUrl = new URL('file://' + pluginPath.replace(/\\/g, '/')).href;
                const mod = await import(pluginUrl);
                const PluginClass = mod[Object.keys(mod).find(k => k.endsWith('Plugin')) ?? Object.keys(mod)[0]];
                if (!PluginClass)
                    throw new Error('No plugin class found');
                const instance = new PluginClass();
                const ctx = this.kernel.createPluginContext(pluginManifest.name);
                await instance.activate(ctx);
                this.plugins.set(instance.id, { manifest: pluginManifest, instance });
                results.push({ id: instance.id, status: 'activated' });
            }
            catch (err) {
                results.push({ id: dirName, status: 'failed', error: err.message });
            }
        }
        return results;
    }
    register(id, manifest, instance) {
        this.plugins.set(id, { manifest, instance });
    }
    get(id) { return this.plugins.get(id)?.instance; }
    list() { return Array.from(this.plugins.keys()); }
    isLoaded(id) { return this.plugins.has(id); }
    parseYaml(raw) {
        const result = {};
        const lines = raw.split('\n');
        let currentKey = null;
        let currentArr = null;
        for (const line of lines) {
            if (line.includes(':') && !line.trimStart().startsWith('-')) {
                if (currentArr && currentKey) {
                    result[currentKey] = currentArr;
                    currentArr = null;
                }
                const colonIdx = line.indexOf(':');
                const key = line.slice(0, colonIdx).trim();
                let val = line.slice(colonIdx + 1).trim();
                if (val.startsWith('"') && val.endsWith('"'))
                    val = val.slice(1, -1);
                if (val === '') {
                    currentKey = key;
                    currentArr = [];
                }
                else {
                    result[key] = val;
                    currentKey = null;
                }
            }
            else if (line.trimStart().startsWith('- ') && currentKey) {
                const item = line.trim().slice(2).trim();
                if (item.includes(':')) {
                    const obj = {};
                    const parts = item.split(/\s*:\s*/);
                    if (parts.length >= 2)
                        obj[parts[0]] = parts.slice(1).join(':');
                    if (currentArr)
                        currentArr.push(obj);
                }
                else {
                    if (currentArr)
                        currentArr.push(item);
                }
            }
            else if (line.trim().startsWith('- {') && currentKey) {
                const jsonStr = line.trim().slice(2).trim();
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (currentArr)
                        currentArr.push(parsed);
                }
                catch { /* skip */ }
            }
            else if (line.trimStart().startsWith('-')) {
                if (currentArr)
                    currentArr.push(line.trim().slice(1).trim());
            }
        }
        if (currentArr && currentKey)
            result[currentKey] = currentArr;
        return result;
    }
}
exports.PluginRegistry = PluginRegistry;
