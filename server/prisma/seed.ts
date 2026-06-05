/**
 * Optional seed. The schema needs no seed data to function — the app creates
 * conversations on the fly. This seeds one sample conversation so a fresh DB
 * has something to look at and to exercise the persistence path.
 *
 * Run with: npm run prisma:seed --workspace server
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const conversation = await prisma.conversation.create({
    data: {
      metadata: { channel: "live-chat", seeded: true },
      messages: {
        create: [
          { sender: "USER", text: "Hi! Do you ship to Canada?" },
          {
            sender: "AI",
            text: "Hi there! Yes, we ship to Canada. Standard international shipping takes 7–12 business days, and it's free on orders over $80. Anything else I can help with?",
          },
        ],
      },
    },
    include: { messages: true },
  });

  console.log(
    `Seeded conversation ${conversation.id} with ${conversation.messages.length} messages.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
