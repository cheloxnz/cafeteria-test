import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function getPassword(ctx: any): Promise<string> {
  const row = await ctx.db.query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "adminPassword"))
    .first();
  return row?.value ?? "admin";
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("products").collect();
  },
});

export const create = mutation({
  args: {
    password: v.string(),
    name: v.string(),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    price: v.number(),
    unit: v.optional(v.string()),
    category: v.string(),
    slug: v.string(),
    kw: v.string(),
    lock: v.number(),
    featured: v.optional(v.boolean()),
    soldOut: v.optional(v.boolean()),
    variants: v.optional(v.array(v.string())),
    variantsEn: v.optional(v.array(v.string())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { password, ...data }) => {
    if (password !== await getPassword(ctx)) throw new Error("Invalid password");
    return ctx.db.insert("products", { ...data, active: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    password: v.string(),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    soldOut: v.optional(v.boolean()),
    variants: v.optional(v.array(v.string())),
    variantsEn: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, password, ...updates }) => {
    if (password !== await getPassword(ctx)) throw new Error("Invalid password");
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("products"), password: v.string() },
  handler: async (ctx, { id, password }) => {
    if (password !== await getPassword(ctx)) throw new Error("Invalid password");
    await ctx.db.delete(id);
  },
});
