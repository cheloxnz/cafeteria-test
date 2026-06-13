import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_PASSWORD = "admin";

async function getPassword(ctx: any): Promise<string> {
  const row = await ctx.db.query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "adminPassword"))
    .first();
  return row?.value ?? DEFAULT_PASSWORD;
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  },
});

export const checkPassword = query({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    return password === await getPassword(ctx);
  },
});

export const setMany = mutation({
  args: {
    settings: v.array(v.object({ key: v.string(), value: v.string() })),
    password: v.string(),
  },
  handler: async (ctx, { settings, password }) => {
    if (password !== await getPassword(ctx)) throw new Error("Invalid password");
    for (const { key, value } of settings) {
      const existing = await ctx.db.query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("settings", { key, value });
      }
    }
  },
});
