import {
  add,
  addDays,
  addHours,
  addSeconds,
  eachDayOfInterval,
  hoursToSeconds,
  isMonday,
  lightFormat,
  parse,
} from "date-fns";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getIssues } from "./jira";

export const tempoRouter = createTRPCRouter({
  addLogs: publicProcedure
    .input(
      z.object({
        startOfWeek: z.date(),
        logs: z.object({
          monday: z.string().array(),
          tuesday: z.string().array(),
          wednesday: z.string().array(),
          thursday: z.string().array(),
          friday: z.string().array(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const worklogs: Array<Worklog> = [];
      if (isMonday(input.startOfWeek) === false) {
        throw new Error("Start of week is not a Monday");
      }
      const dates = eachDayOfInterval({
        start: input.startOfWeek,
        end: addDays(input.startOfWeek, 4),
      });

      for (const date of dates) {
        for (const [day, logs] of Object.entries(input.logs)) {
          const secondsPerEntry = hoursToSeconds(8) / logs.length;
          for (const log of logs) {
            let startTime = parse("08:00:00", "HH:mm:ss", new Date());
            startTime = addSeconds(
              startTime,
              secondsPerEntry * logs.indexOf(log)
            );

            worklogs.push({
              issueId: parseInt(log),
              startDate: lightFormat(date, "yyyy-MM-dd"),
              timeSpentSeconds: secondsPerEntry,
              description: `Time entry for ${day}`,
              account: "KPMG-FUNDS",
              startTime: lightFormat(startTime, "HH:mm:ss"),
            });
          }
        }
      }
      const responses = [];
      for (const worklog of worklogs) {
        const reponse = await tempoRequest("worklogs", "POST", worklog);

        responses.push(await reponse.json());
      }
      console.log(responses);
    }),
});

type Worklog = {
  issueId: number;
  startDate: string;
  startTime?: string;
  timeSpentSeconds: number;
  description: string;
  account?: "KPMG-FUNDS" | "INTERNAL";
};

export const tempoRequest = async <T>(
  api: "worklogs",
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, T>
) => {
  if (!process.env.TEMPO) {
    throw new Error("TEMP environment variable not set");
  }
  if (process.env.PROD) {
    return fetch(`https://api.tempo.io/4/${api}`, {
      headers: {
        Authorization: `Bearer ${process.env.TEMPO}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method,
      body: JSON.stringify(body),
    });
  }

  return new Promise<{ json: () => Promise<Record<string, any>> }>(
    (resolve) => {
      resolve({
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => {
          return {
            id: 1,
            ...body,
          };
        },
      });
    }
  );
};
