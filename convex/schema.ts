import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  products: defineTable({
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
    active: v.optional(v.boolean()),
    variants: v.optional(v.array(v.string())),
    variantsEn: v.optional(v.array(v.string())),
    order: v.optional(v.number()),
  }),

  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    nameEn: v.optional(v.string()),
    order: v.number(),
  }).index("by_order", ["order"]),
});
