var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
function json(body, init = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...init.headers }, ...init });
}
__name(json, "json");
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (pathname === "/v1/init" && req.method === "POST") {
      const { userId, kdf, wrappedVaultKey } = await req.json();
      const metaKey = `meta/${userId}`;
      const exists = await env.VAULTS.get(metaKey);
      if (exists) return new Response("already-exists", { status: 409, headers: corsHeaders() });
      const etag = crypto.randomUUID();
      const doc = { kdf, wrappedVaultKey, etag, version: 1 };
      await env.VAULTS.put(metaKey, JSON.stringify(doc));
      return json({ etag }, { headers: corsHeaders() });
    }
    if (pathname === "/v1/meta" && req.method === "GET") {
      const userId = searchParams.get("user");
      if (!userId) return new Response("bad-request", { status: 400, headers: corsHeaders() });
      const docRaw = await env.VAULTS.get(`meta/${userId}`);
      if (!docRaw) return json({ hasVault: false }, { headers: corsHeaders() });
      const doc = JSON.parse(docRaw);
      return json({ hasVault: true, kdf: doc.kdf, wrappedVaultKey: doc.wrappedVaultKey, etag: doc.etag, version: doc.version }, { headers: corsHeaders() });
    }
    if (pathname === "/v1/get" && req.method === "GET") {
      const userId = searchParams.get("user");
      if (!userId) return new Response("bad-request", { status: 400, headers: corsHeaders() });
      const bin = await env.VAULTS.get(`bin/${userId}`, "arrayBuffer");
      if (!bin) return new Response("not-found", { status: 404, headers: corsHeaders() });
      const metaRaw = await env.VAULTS.get(`meta/${userId}`);
      const meta = metaRaw ? JSON.parse(metaRaw) : null;
      const headers = { "content-type": "application/octet-stream", ...corsHeaders() };
      if (meta) {
        headers["x-stoct-etag"] = meta.etag;
        headers["x-stoct-v"] = String(meta.version);
        headers["x-stoct-kdf"] = JSON.stringify(meta.kdf);
      }
      return new Response(bin, { status: 200, headers });
    }
    if (pathname === "/v1/put" && req.method === "POST") {
      const userId = searchParams.get("user");
      if (!userId) return new Response("bad-request", { status: 400, headers: corsHeaders() });
      const ifMatch = req.headers.get("if-match");
      if (!ifMatch) return new Response("missing-if-match", { status: 400, headers: corsHeaders() });
      const metaKey = `meta/${userId}`;
      const docRaw = await env.VAULTS.get(metaKey);
      if (!docRaw) return new Response("not-found", { status: 404, headers: corsHeaders() });
      const doc = JSON.parse(docRaw);
      if (doc.etag !== ifMatch) {
        return new Response("precondition", { status: 412, headers: corsHeaders() });
      }
      const body = await req.arrayBuffer();
      await env.VAULTS.put(`bin/${userId}`, body);
      const nextEtag = crypto.randomUUID();
      const nextDoc = { ...doc, etag: nextEtag, version: (doc.version ?? 1) + 1 };
      await env.VAULTS.put(metaKey, JSON.stringify(nextDoc));
      const headers = { "x-stoct-etag": nextEtag, "x-stoct-v": String(nextDoc.version), ...corsHeaders() };
      return new Response("ok", { status: 200, headers });
    }
    return new Response("not-found", { status: 404, headers: corsHeaders() });
  }
};
function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, if-match",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  };
}
__name(corsHeaders, "corsHeaders");

// ../../../.nvm/versions/node/v22.20.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.nvm/versions/node/v22.20.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-edaHPE/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../.nvm/versions/node/v22.20.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-edaHPE/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
