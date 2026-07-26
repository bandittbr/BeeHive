export class PluginContext {
    capabilities;
    events;
    storage;
    logger;
    memory;
    ai;
    config;
    permissions;
    workflow;
    constructor(capabilities, events, storage, logger, memory, ai, config, permissions, workflow) {
        this.capabilities = capabilities;
        this.events = events;
        this.storage = storage;
        this.logger = logger;
        this.memory = memory;
        this.ai = ai;
        this.config = config;
        this.permissions = permissions;
        this.workflow = workflow;
    }
    registerCapability(capability) {
        this.capabilities.register('plugin', capability);
    }
    unregisterCapability(capabilityId) {
        this.capabilities.unregister('plugin', capabilityId);
    }
    publishEvent(event) {
        this.events.publish(event);
    }
}
