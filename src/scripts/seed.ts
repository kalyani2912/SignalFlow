import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client.js";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, { fullResults: true });
const prisma = new PrismaClient({ adapter } as any);

async function seed() {
  // Check if already seeded
  const campaignCount = await prisma.campaign.count();
  if (campaignCount > 0) {
    console.log(`Database already seeded (${campaignCount} campaigns found). Skipping.`);
    return;
  }

  console.log("Seeding database...");
  const now = new Date().toISOString();

  // --- Campaigns ---
  const campaigns = [
    {
      id: uuidv4(),
      name: "Cart Abandonment Recovery",
      brandId: "brand-urbanstyle",
      status: "active",
      channels: ["sms", "email"],
      triggerRules: [
        { signalType: "checkout_abandon", conditions: {} },
      ],
      messageTemplate: "Hey {{shopperName}}, you left items in your cart! Complete your purchase and get 10% off.",
      toneGuidelines: "Friendly, urgent but not pushy. Use casual language.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "Welcome Series",
      brandId: "brand-urbanstyle",
      status: "active",
      channels: ["email", "whatsapp"],
      triggerRules: [
        { signalType: "page_view", conditions: { firstVisit: true } },
      ],
      messageTemplate: "Welcome to UrbanStyle! Here's 15% off your first order.",
      toneGuidelines: "Warm, welcoming. Highlight brand values.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "Browse Abandonment",
      brandId: "brand-urbanstyle",
      status: "active",
      channels: ["instagram_dm"],
      triggerRules: [
        { signalType: "product_view", conditions: {} },
      ],
      messageTemplate: "Still thinking about {{productName}}? It's selling fast!",
      toneGuidelines: "Casual, FOMO-inducing. Keep it short for DM format.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "Post-Purchase Follow-up",
      brandId: "brand-urbanstyle",
      status: "active",
      channels: ["email"],
      triggerRules: [
        { signalType: "purchase", conditions: {} },
      ],
      messageTemplate: "Thanks for your order! Here are some items that go great with your purchase.",
      toneGuidelines: "Grateful, helpful. Cross-sell without being salesy.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "High-Value Cart Alert",
      brandId: "brand-urbanstyle",
      status: "draft",
      channels: ["sms", "email", "whatsapp"],
      triggerRules: [
        { signalType: "add_to_cart", conditions: { cartValue: 100 } },
      ],
      messageTemplate: "Your cart is looking great! Free shipping on orders over $100.",
      toneGuidelines: "Excited, rewarding. Emphasize the free shipping threshold.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const c of campaigns) {
    await prisma.campaign.create({
      data: {
        id: c.id,
        name: c.name,
        brandId: c.brandId,
        status: c.status,
        channels: c.channels,
        triggerRules: c.triggerRules,
        messageTemplate: c.messageTemplate,
        toneGuidelines: c.toneGuidelines,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
    });
  }
  console.log(`  Created ${campaigns.length} campaigns`);

  // --- Signals ---
  const shopperIds = ["shopper-emma-j", "shopper-raj-k", "shopper-maria-s", "shopper-alex-t", "shopper-lisa-w"];
  const signalTypes = ["page_view", "product_view", "add_to_cart", "checkout_start", "checkout_abandon", "purchase"];
  const sources = ["web", "mobile-app", "web"];
  const products = ["Classic White Sneakers", "Leather Crossbody Bag", "Oversized Denim Jacket", "Silk Scarf", "Canvas Tote"];

  const signals = [];
  for (let i = 0; i < 25; i++) {
    const shopperId = shopperIds[i % shopperIds.length];
    const signalType = signalTypes[i % signalTypes.length];
    const product = products[i % products.length];
    const minutesAgo = (25 - i) * 12;
    const timestamp = new Date(Date.now() - minutesAgo * 60000).toISOString();

    signals.push({
      id: uuidv4(),
      shopperId,
      signalType,
      payload: {
        productName: product,
        category: i % 2 === 0 ? "shoes" : "accessories",
        cartValue: 45 + i * 8.5,
        pageUrl: `/products/${product.toLowerCase().replace(/ /g, "-")}`,
      },
      sessionId: `sess-${shopperId}-${Math.floor(i / 5)}`,
      timestamp,
      source: sources[i % sources.length],
    });
  }

  for (const s of signals) {
    await prisma.signal.create({
      data: {
        id: s.id,
        shopperId: s.shopperId,
        signalType: s.signalType,
        payload: s.payload,
        sessionId: s.sessionId,
        timestamp: s.timestamp,
        source: s.source,
      },
    });
  }
  console.log(`  Created ${signals.length} signals`);

  // --- Messages (generated from matching signals + campaigns) ---
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  let messageCount = 0;

  for (const signal of signals) {
    for (const campaign of activeCampaigns) {
      const matches = campaign.triggerRules.some(
        (rule: any) => rule.signalType === signal.signalType
      );
      if (!matches) continue;

      for (const channel of campaign.channels) {
        await prisma.message.create({
          data: {
            id: uuidv4(),
            campaignId: campaign.id,
            shopperId: signal.shopperId,
            channel,
            body: `[AI] ${campaign.messageTemplate?.replace("{{productName}}", signal.payload.productName as string).replace("{{shopperName}}", signal.shopperId.replace("shopper-", "")) ?? "Personalized message"}`,
            generatedAt: signal.timestamp,
            status: Math.random() > 0.1 ? "sent" : "failed",
            metadata: {
              aiModel: "claude-sonnet-4-6",
              confidenceScore: 0.85 + Math.random() * 0.15,
              generationLatencyMs: 120 + Math.floor(Math.random() * 80),
            },
          },
        });
        messageCount++;
      }
    }
  }
  console.log(`  Created ${messageCount} messages`);

  console.log("Seeding complete!");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
