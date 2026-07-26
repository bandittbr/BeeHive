"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kernel = void 0;
const Container_1 = require("./Container/Container");
const EventBus_1 = require("./EventBus/EventBus");
const PluginRegistry_1 = require("./PluginRegistry/PluginRegistry");
const CapabilityRegistry_1 = require("./CapabilityRegistry/CapabilityRegistry");
const Logger_1 = require("./Logger/Logger");
const ConfigManager_1 = require("./ConfigManager/ConfigManager");
class StubStorage {
    get(key) { return Promise.resolve(null); }
    set(key, value, ttl) { return Promise.resolve(); }
    delete(key) { return Promise.resolve(); }
    list(prefix) { return Promise.resolve([]); }
}
class StubMemory {
    search(query, limit) { return Promise.resolve([]); }
    store(entry) { return Promise.resolve('mem-' + Date.now()); }
    get(id) { return Promise.resolve(null); }
    delete(id) { return Promise.resolve(); }
}
class StubAI {
    chat(messages, options) {
        return Promise.resolve({ id: 'stub', content: 'Stub response', model: 'stub', provider: 'stub', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latency: 0 });
    }
    chatStream(messages, options) {
        return { async *[Symbol.asyncIterator]() { } };
    }
}
class StubPermissions {
    async hasPermission(subject, action, resource) { return true; }
    async requirePermission(subject, action, resource) { }
}
class StubWorkflow {
    async execute(workflowId, inputs) { return null; }
    async getStatus(instanceId) { return 'completed'; }
}
const context_1 = require("../packages/sdk/src/context");
const WorkflowRuntime_1 = require("./WorkflowRuntime/WorkflowRuntime");
class Kernel {
    id;
    version = '0.1.0';
    status = 'stopped';
    container;
    events;
    plugins;
    capabilities;
    logger;
    config;
    _workflowRuntime = null;
    constructor() {
        this.id = 'kernel-' + Date.now().toString(36);
        this.container = new Container_1.Container();
        this.events = new EventBus_1.EventBus();
        this.plugins = new PluginRegistry_1.PluginRegistry(this);
        this.capabilities = new CapabilityRegistry_1.CapabilityRegistry();
        this.logger = new Logger_1.Logger();
        this.config = new ConfigManager_1.ConfigManager();
    }
    createPluginContext(pluginName) {
        return new context_1.PluginContext(this.capabilities, this.events, new StubStorage(), this.logger, new StubMemory(), new StubAI(), this.config, new StubPermissions(), new StubWorkflow());
    }
    async boot() {
        this.logger.info('Booting BeeHive Kernel...');
        const start = Date.now();
        await this.config.load();
        this.container.register('kernel', this);
        this.container.register('events', this.events);
        this.container.register('plugins', this.plugins);
        this.container.register('capabilities', this.capabilities);
        this.container.register('logger', this.logger);
        const pluginResult = await this.plugins.discoverAndActivate();
        // Initialize WorkflowRuntime after plugins are loaded
        this._workflowRuntime = new WorkflowRuntime_1.WorkflowRuntime(this.capabilities, this.events, this.logger);
        this.events.publish({
            type: 'kernel:booted',
            source: 'kernel',
            payload: { kernelId: this.id },
            timestamp: Date.now(),
        });
        this.logger.info('Kernel booted in ' + (Date.now() - start) + 'ms');
        return {
            kernel: { version: this.version, status: 'running', duration: Date.now() - start },
            plugins: pluginResult,
            capabilities: this.capabilities.list().length,
            providers: 0,
        };
    }
    async shutdown() { }
    async health() {
        return { status: 'running', uptime: 0, plugins: {}, capabilities: 0, memory: { heapUsed: 0, heapTotal: 0, rss: 0 } };
    }
    // IKernel compat
    get scheduler() { throw new Error('NotImplemented: Scheduler'); }
    get workflows() { return this._workflowRuntime; }
    get agents() { throw new Error('NotImplemented: AgentRuntime'); }
    get resourceManager() { throw new Error('NotImplemented: ResourceManager'); }
    get knowledgeGraph() { throw new Error('NotImplemented: KnowledgeGraph'); }
    get secrets() { throw new Error('NotImplemented: Secrets'); }
    get metrics() { throw new Error('NotImplemented: Metrics'); }
    get permissions() { throw new Error('NotImplemented: Permissions'); }
    get memory() { throw new Error('NotImplemented: Memory'); }
    get storage() { throw new Error('NotImplemented: Storage'); }
}
exports.Kernel = Kernel;
