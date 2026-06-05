import { Router } from "express";
import {
  chatController,
  chatMessageSchema,
} from "../controllers/chat.controller";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";

/**
 * Live-chat channel routes. The channel only touches this route/controller
 * layer — chat.service is reused unchanged by any future channel.
 */
export const chatRoutes = Router();

chatRoutes.post(
  "/message",
  validateBody(chatMessageSchema),
  asyncHandler(chatController.postMessage)
);

chatRoutes.get(
  "/:sessionId/messages",
  asyncHandler(chatController.getMessages)
);
