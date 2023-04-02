import { createTRPCRouter } from "~/server/api/trpc";
import { jiraRouter } from "~/server/api/routers/jira";
import { tempoRouter } from "./routers/tempo";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  jiraRouter,
  tempoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
