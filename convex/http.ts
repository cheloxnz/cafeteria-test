import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { generate } from "./generate";

const http = httpRouter();

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// Preflight CORS
http.route({
  pathPrefix: "/api/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});

// GET /api/settings — público, carga nombre/dirección/tagline
http.route({
  path: "/api/settings",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const settings = await ctx.runQuery(api.settings.getAll);
    return json(settings);
  }),
});

// POST /api/auth — verifica contraseña
http.route({
  path: "/api/auth",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { password } = await req.json();
    const ok = await ctx.runQuery(api.settings.checkPassword, { password });
    return json({ ok });
  }),
});

// POST /api/settings — guarda configuración (requiere password)
http.route({
  path: "/api/settings",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      await ctx.runMutation(api.settings.setMany, body);
      return json({ ok: true });
    } catch (e: any) {
      return json({ ok: false, error: e.message }, 403);
    }
  }),
});

// GET /api/products — público
http.route({
  path: "/api/products",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const products = await ctx.runQuery(api.products.list);
    return json(products);
  }),
});

// POST /api/products — create / update / delete (requiere password en body)
http.route({
  path: "/api/products",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      if (body.action === "create") {
        await ctx.runMutation(api.products.create, body);
      } else if (body.action === "update") {
        await ctx.runMutation(api.products.update, body);
      } else if (body.action === "delete") {
        await ctx.runMutation(api.products.remove, body);
      } else {
        return json({ ok: false, error: "Unknown action" }, 400);
      }
      return json({ ok: true });
    } catch (e: any) {
      return json({ ok: false, error: e.message }, 403);
    }
  }),
});

// POST /api/generate — genera imagen + caption con IA
http.route({
  path: "/api/generate",
  method: "POST",
  handler: generate,
});

export default http;
