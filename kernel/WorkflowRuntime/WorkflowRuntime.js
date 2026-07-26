"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRuntime = void 0;
const sdk_1 = require("@beehive/sdk");
function resolveTemplate(template, ctx) {
    return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
        const trimmed = key.trim();
        const parts = trimmed.split('.');
        let val = ctx;
        for (const part of parts) {
            if (val && typeof val === 'object')
                val = val[part];
            else
                return '{{' + trimmed + '}}';
        }
        return val !== undefined ? String(val) : '{{' + trimmed + '}}';
    });
}
class WorkflowRuntime {
    capabilities;
    events;
    logger;
    workflows = new Map();
    instances = new Map();
    constructor(capabilities, events, logger) {
        this.capabilities = capabilities;
        this.events = events;
        this.logger = logger;
    }
    register(definition) {
        this.workflows.set(definition.id, { definition });
        this.logger.info('Workflow registered: ' + definition.id);
        this.events.publish(sdk_1.EventBuilder.create('workflow:registered', 'runtime')
            .withPayload({ workflowId: definition.id, name: definition.name }).build());
    }
    listDefinitions() {
        return Array.from(this.workflows.values()).map((w) => w.definition);
    }
    async start(workflowId, input) {
        const registered = this.workflows.get(workflowId);
        if (!registered)
            throw new Error('Workflow not found: ' + workflowId);
        const definition = registered.definition;
        const instance = {
            id: 'wf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
            workflowId, status: 'running', currentStep: null,
            context: { input: { ...input } }, stepResults: {}, startedAt: Date.now(),
        };
        this.instances.set(instance.id, instance);
        this.logger.info('Workflow started: ' + workflowId + ' (' + instance.id + ')');
        this.events.publish(sdk_1.EventBuilder.create('workflow:started', 'runtime')
            .withPayload({ workflowId, instanceId: instance.id, input }).build());
        try {
            for (const step of definition.steps) {
                instance.currentStep = step.id;
                await this.executeStep(step, instance);
            }
            instance.status = 'completed';
            instance.completedAt = Date.now();
        }
        catch (e) {
            instance.status = 'failed';
            instance.error = e.message;
            instance.completedAt = Date.now();
        }
        this.events.publish(sdk_1.EventBuilder.create('workflow:completed', 'runtime')
            .withPayload({ workflowId, instanceId: instance.id, status: instance.status,
            duration: (instance.completedAt || Date.now()) - instance.startedAt }).build());
        return instance;
    }
    async executeStep(step, instance) {
        this.events.publish(sdk_1.EventBuilder.create('workflow:step:started', 'runtime')
            .withPayload({ instanceId: instance.id, stepId: step.id, stepType: step.type }).build());
        if (step.type === 'capability')
            await this.executeCapability(step, instance);
        else if (step.type === 'condition')
            await this.executeCondition(step, instance);
        else if (step.type === 'foreach')
            await this.executeForeach(step, instance);
        else if (step.type === 'parallel')
            await this.executeParallel(step, instance);
        this.events.publish(sdk_1.EventBuilder.create('workflow:step:completed', 'runtime')
            .withPayload({ instanceId: instance.id, stepId: step.id }).build());
    }
    async executeCapability(step, instance) {
        const resolvedInput = {};
        for (const [key, template] of Object.entries(step.input)) {
            resolvedInput[key] = resolveTemplate(template, instance.context);
        }
        const ctx = {
            correlationId: instance.id, logger: this.logger, events: this.events,
        };
        const cap = this.capabilities.resolve(step.capability);
        const result = await cap.execute(resolvedInput, ctx);
        if (step.output && instance.stepResults) {
            instance.stepResults[step.output] = result.outputs;
            instance.context[step.output] = result.outputs;
        }
    }
    async executeCondition(step, instance) {
        const resolved = resolveTemplate(step.if, instance.context);
        const isTrue = resolved === 'true' || resolved === 'yes' || resolved === '1';
        const branch = isTrue ? step.then : step.else;
        if (branch)
            for (const s of branch)
                await this.executeStep(s, instance);
    }
    async executeForeach(step, instance) {
        const resolved = resolveTemplate(step.items, instance.context);
        let items;
        try {
            items = JSON.parse(resolved);
        }
        catch {
            items = [resolved];
        }
        if (!Array.isArray(items))
            items = [items];
        for (let i = 0; i < items.length; i++) {
            instance.context['item'] = items[i];
            instance.context['index'] = i;
            for (const s of step.steps)
                await this.executeStep(s, instance);
        }
    }
    async executeParallel(step, instance) {
        await Promise.all(step.parallel.map(async (branch) => {
            for (const s of branch)
                await this.executeStep(s, instance);
        }));
    }
    async cancel(instanceId) {
        const inst = this.instances.get(instanceId);
        if (inst) {
            inst.status = 'cancelled';
            inst.completedAt = Date.now();
            this.events.publish(sdk_1.EventBuilder.create('workflow:cancelled', 'runtime')
                .withPayload({ instanceId, workflowId: inst.workflowId }).build());
        }
    }
    async pause(instanceId) {
        const inst = this.instances.get(instanceId);
        if (inst) {
            inst.status = 'paused';
            this.events.publish(sdk_1.EventBuilder.create('workflow:paused', 'runtime')
                .withPayload({ instanceId, workflowId: inst.workflowId }).build());
        }
    }
    async resume(instanceId) {
        const inst = this.instances.get(instanceId);
        if (inst && inst.status === 'paused') {
            inst.status = 'running';
            this.events.publish(sdk_1.EventBuilder.create('workflow:resumed', 'runtime')
                .withPayload({ instanceId, workflowId: inst.workflowId }).build());
        }
    }
    async getInstance(instanceId) {
        return this.instances.get(instanceId) ?? null;
    }
    list() {
        return Array.from(this.instances.values());
    }
}
exports.WorkflowRuntime = WorkflowRuntime;
