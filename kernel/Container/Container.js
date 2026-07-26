"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
class Container {
    services = new Map();
    register(id, instance) {
        this.services.set(id, instance);
    }
    resolve(id) {
        const svc = this.services.get(id);
        if (!svc)
            throw new Error(`Service not found: ${id}`);
        return svc;
    }
    has(id) {
        return this.services.has(id);
    }
    unregister(id) {
        this.services.delete(id);
    }
}
exports.Container = Container;
