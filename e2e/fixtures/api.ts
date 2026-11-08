/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Direct API client, used for three things the browser must not be asked to do:
//   1. capturing a bearer token once per run (see auth.ts),
//   2. asserting what the server actually returns, independently of rendering,
//   3. cleaning up rows a spec created, in test.afterEach.
//
// Every GET carries an L8Query in ?body= -- L8QueryRules Rule 1 forbids a bare
// GET, and the server answers `Cannot find pb for method GET` + 400 without it.
// The `from` clause takes the protobuf type name, never the ServiceName
// (ProtobufRules); callers pass `model` from the generated inventory, which is
// read straight off the shipped module config, so it is always the former.

import { request, APIRequestContext } from '@playwright/test';
import { ENV, apiUrl } from './env';

export interface QueryResult<T = Record<string, unknown>> {
    list: T[];
    metadata?: { keyCount?: { counts?: Record<string, number> } };
}

export class Api {
    private constructor(
        private ctx: APIRequestContext,
        readonly token: string
    ) {}

    /**
     * Authenticates and returns a client whose session is not hit by the
     * l8orm query-cache collision (see sessionCollides). The colliding case is
     * asserted on its own by 16-api-contract's test.fail(), so the rest of the
     * suite exercises the UI rather than that one upstream bug.
     */
    static async login(user = ENV.user, pass = ENV.pass): Promise<Api> {
        for (let attempt = 0; attempt < 12; attempt++) {
            const api = await Api.rawLogin(user, pass);
            if (!(await sessionCollides(api))) return api;
            await api.dispose();
        }
        throw new Error(`could not obtain a non-colliding session for "${user}" in 12 logins`);
    }

    /** Authenticates and returns a client. Throws on bad credentials. */
    static async rawLogin(user = ENV.user, pass = ENV.pass): Promise<Api> {
        const ctx = await request.newContext({
            baseURL: ENV.baseURL,
            ignoreHTTPSErrors: true,
            timeout: ENV.apiTimeoutMs
        });
        const res = await ctx.post('/auth', {
            headers: { 'Content-Type': 'application/json' },
            data: { user, pass }
        });
        if (!res.ok()) {
            throw new Error(`auth failed for "${user}": HTTP ${res.status()} ${await res.text()}`);
        }
        const body = await res.json();
        if (body.needTfa === 2 || body.setupTfa === 2) {
            throw new Error(`auth for "${user}" requires TFA; pick an account with fa != Need_Fa`);
        }
        if (!body.token) {
            throw new Error(`auth for "${user}" returned no token: ${JSON.stringify(body)}`);
        }
        return new Api(ctx, body.token);
    }

    private headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    /** Runs an L8Query against a service endpoint (e.g. '/30/Employee'). */
    async query<T = Record<string, unknown>>(endpoint: string, text: string): Promise<QueryResult<T>> {
        const body = encodeURIComponent(JSON.stringify({ text }));
        const res = await this.ctx.get(`${apiUrl(endpoint)}?body=${body}`, { headers: this.headers() });
        if (!res.ok()) {
            throw new Error(`GET ${endpoint} [${text}] -> HTTP ${res.status()} ${await res.text()}`);
        }
        const json = await res.json();
        return { list: json.list || [], metadata: json.metadata };
    }

    /** First page of a model, exactly as the table asks for it. */
    listFirstPage<T = Record<string, unknown>>(endpoint: string, model: string, pageSize = 10) {
        return this.query<T>(endpoint, `select * from ${model} limit ${pageSize} page 0`);
    }

    /** Total row count the dashboard-style metadata reports. */
    async total(endpoint: string, model: string): Promise<number> {
        const r = await this.query(endpoint, `select * from ${model} limit 1 page 0`);
        return r.metadata?.keyCount?.counts?.Total ?? 0;
    }

    async post(endpoint: string, data: unknown) {
        const res = await this.ctx.post(apiUrl(endpoint), { headers: this.headers(), data });
        if (!res.ok()) {
            throw new Error(`POST ${endpoint} -> HTTP ${res.status()} ${await res.text()}`);
        }
        return res.json().catch(() => ({}));
    }

    async put(endpoint: string, data: unknown) {
        const res = await this.ctx.put(apiUrl(endpoint), { headers: this.headers(), data });
        if (!res.ok()) {
            throw new Error(`PUT ${endpoint} -> HTTP ${res.status()} ${await res.text()}`);
        }
        return res.json().catch(() => ({}));
    }

    /**
     * Deletes one record. DELETE carries an L8Query body selecting the row, the
     * same shape layer8d-module-crud.js sends.
     */
    async deleteById(endpoint: string, model: string, primaryKey: string, id: string) {
        const res = await this.ctx.delete(apiUrl(endpoint), {
            headers: this.headers(),
            data: { text: `select * from ${model} where ${primaryKey}=${id}` }
        });
        if (!res.ok()) {
            throw new Error(`DELETE ${endpoint} ${id} -> HTTP ${res.status()} ${await res.text()}`);
        }
    }

    /** Per-type allowed actions for this token: { TypeName: [1,2,3,4,5] }. */
    async permissions(): Promise<Record<string, number[]>> {
        const res = await this.ctx.get('/permissions', { headers: this.headers() });
        if (!res.ok()) {
            throw new Error(`GET /permissions -> HTTP ${res.status()}`);
        }
        return res.json();
    }

    async health() {
        return this.query('/0/Health', 'select * from L8Health limit 10 page 0');
    }

    async dispose() {
        await this.ctx.dispose();
    }
}

/**
 * Runs a cleanup action so that its failure can never mask the test's own
 * pass/fail -- PostImplementationE2ETesting is explicit that a cleanup error
 * must not decide the result, but leaving the row behind silently is how a
 * live cluster accumulates orphans that break later runs. So: never throw,
 * always report.
 */
export async function safeCleanup(what: string, fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (e) {
        console.warn(`[cleanup] failed to remove ${what}: ${(e as Error).message}`);
    }
}

/**
 * KNOWN UPSTREAM BUG (l8parser go/parser/service/ParsingCenter.go JobComplete):
 * when CTableToInstances yields zero instances -- the cluster has none of that
 * resource -- the parser PATCHes the bare element, which carries nothing but
 * ClusterName. The inventory then holds one keyless "phantom" record per empty
 * K8s resource type. Returns the models whose first page contains such a record.
 */
export async function phantomModels(
    api: Api, services: { endpoint: string | null; model: string | null }[]
): Promise<Set<string>> {
    const out = new Set<string>();
    for (const s of services) {
        if (!s.endpoint || !s.model) continue;
        const r = await api.query(s.endpoint, `select * from ${s.model} limit 5 page 0`).catch(() => null);
        if (!r) continue;
        if (r.list.some((item) => Object.keys(item).every((k) => k === 'clusterName'))) out.add(s.model);
    }
    return out;
}

/**
 * KNOWN UPSTREAM BUG (l8orm plugins/postgres/Read.go readWithIndex):
 *   hash = hash<<32 | int64(hashString(aaaId))
 * hashString returns int32; for a session whose AaaId hashes negative (about
 * half of them) the sign extension sets all upper 32 bits and erases the query
 * hash, so EVERY query of that session shares one cache entry and returns the
 * first query's result (30s TTL, refreshed while used). Fix:
 *   hash = hash<<32 | int64(uint32(hashString(aaaId)))
 * Detects it on the Targets service (two filters with disjoint seeded results).
 */
export async function sessionCollides(api: Api): Promise<boolean> {
    const net = await api.query('/91/Targets', 'select * from L8PTarget where inventoryType=1 limit 5 page 0');
    const gpu = await api.query('/91/Targets', 'select * from L8PTarget where inventoryType=2 limit 5 page 0');
    const ids = (r: { list: Record<string, unknown>[] }) => r.list.map((t) => String(t.targetId)).join(',');
    return ids(net) !== '' && ids(net) === ids(gpu);
}
