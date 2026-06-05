/**
 * The single PrismaClient instance. Confined to the repositories layer —
 * nothing outside repositories/ imports Prisma, keeping persistence swappable
 * and services testable.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
