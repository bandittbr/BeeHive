"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    info(msg, meta) { console.log(`[INFO] ${msg}`, meta ?? ''); }
    warn(msg, meta) { console.warn(`[WARN] ${msg}`, meta ?? ''); }
    error(msg, meta) { console.error(`[ERROR] ${msg}`, meta ?? ''); }
    debug(msg, meta) { console.debug(`[DEBUG] ${msg}`, meta ?? ''); }
    child(context) { return this; }
}
exports.Logger = Logger;
