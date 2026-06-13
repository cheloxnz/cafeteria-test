import { httpAction } from "./_generated/server";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TONE_MAP: Record<string, string> = {
  "Cálido":    "warm, inviting and heartfelt",
  "Cercano":   "friendly, casual and close",
  "Gourmet":   "sophisticated, premium and refined",
  "Divertido": "fun, playful and energetic",
};

const TYPE_MAP: Record<string, string> = {
  promo:       "current promotion or special offer",
  descuento:   "20% discount — limited time",
  lanzamiento: "exciting new product launch",
  temporada:   "seasonal special of the moment",
};

const FORMAT_RATIO: Record<string, string> = {
  square:    "1:1",
  story:     "9:16",
  landscape: "16:9",
  carousel:  "1:1",
};

async function generateCaption(opts: {
  productName: string;
  productDesc: string;
  productPrice: string;
  type: string;
  tone: string;
  detail: string;
  brandName: string;
  inEnglish: boolean;
}): Promise<{ text: string; hashtags: string }> {
  const lang    = opts.inEnglish ? "English" : "Spanish (Argentina, informal vos form)";
  const toneStr = TONE_MAP[opts.tone] || opts.tone;
  const typeStr = TYPE_MAP[opts.type] || opts.type;

  const prompt = `You are a social media copywriter for a specialty café called "${opts.brandName}".
Write an Instagram caption in ${lang}.

Product: ${opts.productName}${opts.productDesc ? ` — ${opts.productDesc}` : ""}
Price: ${opts.productPrice}
Post type: ${typeStr}
Tone: ${toneStr}
${opts.detail ? `Key message to highlight: ${opts.detail}` : ""}

Rules:
- Maximum 2-3 short sentences
- 1-2 relevant emojis, naturally placed
- Sound human and genuine, not corporate
- End with a soft call to action (visit, try it, come in)
- No quotes around the caption

Then on a new line write 4-5 hashtags.

Format:
CAPTION: [caption]
HASHTAGS: [#tag1 #tag2 #tag3 #tag4]`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.85,
    }),
  });

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";

  const captionMatch  = raw.match(/CAPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|$)/);
  const hashtagsMatch = raw.match(/HASHTAGS:\s*([\s\S]+)/);

  return {
    text:     captionMatch?.[1]?.trim()  ?? raw.trim(),
    hashtags: hashtagsMatch?.[1]?.trim() ?? "",
  };
}

async function generateImage(opts: {
  productName: string;
  productDesc: string;
  category: string;
  type: string;
  format: string;
}): Promise<string> {
  const style = opts.type === "temporada"
    ? "seasonal presentation, warm autumn/winter tones, cozy café atmosphere"
    : "clean minimal background or rustic wooden café table";

  const prompt = `Professional food and beverage photography: ${opts.productName}${opts.productDesc ? `, ${opts.productDesc}` : ""}.
${opts.category} category. ${style}.
High-end artisan café aesthetic, natural soft lighting, Instagram-worthy composition,
warm beige and brown tones, top-down or 45-degree angle, shallow depth of field, appetizing.
No text, no people, no watermarks.`;

  const aspectRatio = FORMAT_RATIO[opts.format] ?? "1:1";

  const createRes = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: aspectRatio,
          output_format: "webp",
          output_quality: 85,
          go_fast: true,
        },
      }),
    }
  );

  const prediction = await createRes.json() as {
    id?: string;
    output?: string[];
    urls?: { get?: string };
    status?: string;
    error?: string;
  };

  if (prediction.output?.[0]) return prediction.output[0];

  // Polling si Prefer:wait no devolvió resultado inmediato
  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes  = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    const pollData = await pollRes.json() as {
      status?: string;
      output?: string[];
      error?: string;
    };
    if (pollData.status === "succeeded") return pollData.output?.[0] ?? "";
    if (pollData.status === "failed")    throw new Error(pollData.error ?? "Image generation failed");
  }

  throw new Error("Image generation timed out");
}

export const generate = httpAction(async (_ctx, req) => {
  try {
    const body = await req.json() as {
      product: { name: string; desc?: string; price?: string; cat?: string };
      type: string;
      tone: string;
      detail?: string;
      format?: string;
      options?: { english?: boolean };
      brandName?: string;
    };

    const { product, type, tone, detail, format, options, brandName } = body;

    const [caption, imageUrl] = await Promise.all([
      generateCaption({
        productName:  product.name,
        productDesc:  product.desc  ?? "",
        productPrice: product.price ?? "",
        type,
        tone:      tone ?? "Cálido",
        detail:    detail ?? "",
        brandName: brandName ?? "Café Lúmina",
        inEnglish: options?.english ?? false,
      }),
      generateImage({
        productName: product.name,
        productDesc: product.desc ?? "",
        category:    product.cat  ?? "",
        type,
        format:      format ?? "square",
      }),
    ]);

    return new Response(JSON.stringify({ ok: true, caption, imageUrl }), {
      status: 200,
      headers: CORS,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: CORS,
    });
  }
});
