"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
class ConfigManager {
    config = new Map();
    async load() { }
    get(key, defaultVal) {
        return (this.config.get(key) ?? defaultVal);
    }
    set(key, value) { this.config.set(key, value); }
    delete(key) { this.config.delete(key); }
    getAll() { return Object.fromEntries(this.config); }
    watch(key, cb) {
        return () => { }; // TODO
    }
    getPluginConfig(pluginId) {
        return this.config.get(`plugin:${pluginId}`) ?? {};
    }
}
exports.ConfigManager = ConfigManager;
