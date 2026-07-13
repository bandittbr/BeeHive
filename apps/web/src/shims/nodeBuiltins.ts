/*
 * Stub de builtins do Node para o bundle do browser.
 *
 * O @beehive/platform é compartilhado entre Node (apps/api) e browser
 * (apps/web). Alguns módulos server-only importam `node:*` (crypto, fs, os,
 * path). No browser esses builtins não existem e quebram o `vite build`.
 * Como o código server-only nunca é executado no browser, basta resolver os
 * imports para no-ops. Os testes (vitest, em Node) continuam usando os reais.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => any;

const noop: AnyFn = () => undefined;

// Proxy que responde a qualquer acesso com uma função no-op (e é callable).
const universalProxy: any = new Proxy(noop, {
  get: (_t, prop) => {
    if (prop === 'then') return undefined;
    if (prop === Symbol.toPrimitive) return () => '';
    return (..._args: any[]) => undefined;
  },
  apply: () => undefined,
});

const fsPromises: any = new Proxy(
  {},
  {
    get: () => (..._args: any[]) => Promise.resolve(undefined),
  },
);

export default universalProxy;

export const promises = fsPromises;

// node:fs
export const existsSync = noop;
export const mkdirSync = noop;
export const readFileSync = noop;
export const writeFileSync = noop;
export const readdirSync = noop;
export const rmSync = noop;
export const unlinkSync = noop;
export const statSync = noop;
export const createReadStream = noop;
export const createWriteStream = noop;

// node:path
export const dirname = noop;
export const join = noop;
export const resolve = noop;
export const basename = noop;
export const extname = noop;
export const parse = noop;
export const relative = noop;
export const isAbsolute = noop;
export const sep = '/';
export const EOL = '\n';

// node:crypto
export const randomBytes = noop;
export const randomUUID = noop;
export const createCipheriv = noop;
export const createDecipheriv = noop;
export const pbkdf2Sync = noop;
export const pbkdf2 = noop;
export const createHash = noop;
export const createHmac = noop;
export const scryptSync = noop;
export const timingSafeEqual = noop;
export const getCiphers = noop;

// node:os
export const cpus = noop;
export const homedir = noop;
export const platform = noop;
export const tmpdir = noop;
export const userInfo = noop;
export const arch = noop;
export const type = noop;
export const release = noop;
export const networkInterfaces = noop;
export const hostname = noop;
export const loadavg = noop;
export const totalmem = noop;
export const freemem = noop;
export const uptime = noop;
