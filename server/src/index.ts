/**
 * Boot: validate env (imported for its side effect), assemble the app, listen.
 */
import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Spur chat server listening on port ${env.PORT}`);
  console.log(`LLM provider: ${env.LLM_PROVIDER}`);
});
