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
      const myself = await getMyself();
      const issues = await getIssues();
      const worklogs: Array<Worklog> = [];
      if (isMonday(input.startOfWeek) === false) {
        throw new Error("Start of week is not a Monday");
      }
      const dates = eachDayOfInterval({
        start: input.startOfWeek,
        end: addDays(input.startOfWeek, 4),
      });
      let dayIdx = 0;
      for (const [day, logs] of Object.entries(input.logs)) {
        const secondsPerEntry = hoursToSeconds(8) / logs.length;
        for (const log of logs) {
          let startTime = parse("08:00:00", "HH:mm:ss", new Date());
          startTime = addSeconds(
            startTime,
            secondsPerEntry * logs.indexOf(log)
          );
          const date = dates[dayIdx];
          if (date === undefined) {
            throw new Error("Date is undefined");
          }
          const issue = issues.find((issue) => issue.id === log);
          if (issue === undefined) {
            throw new Error("Issue not found");
          }
          worklogs.push({
            issueId: parseInt(log),
            startDate: lightFormat(date, "yyyy-MM-dd"),
            timeSpentSeconds: secondsPerEntry,
            description: `Did work on ${issue.title}`,
            account: "KPMG-FUNDS",
            startTime: lightFormat(startTime, "HH:mm:ss"),
            authorAccountId: myself.accountId,
          });
        }
        dayIdx++;
      }
      const responses = [];
      for (const worklog of worklogs) {
        const reponse = await tempoRequest("worklogs", "POST", {
          ...worklog,
          attributes: [
            {
              key: "_Account_",
              value: worklog.account,
            },
          ],
        });

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
  authorAccountId: string;
};

export const tempoRequest = async <T>(
  api: "worklogs",
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body: Record<string, T> & { accountId?: string }
) => {
  if (!process.env.TEMPO) {
    throw new Error("TEMP environment variable not set");
  }
  if (true) {
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

const MyselfSchema = z.object({
  accountId: z.string(),
  emailAddress: z.string(),
  displayName: z.string(),
});

const getMyself = async () => {
  const response = await fetch(
    `https://parklaneit.atlassian.net/rest/api/3/myself`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `devinda.senanayaka@parklane.com.au:${env.JIRA}`
        ).toString("base64")}`,
        Accept: "application/json",
      },
    }
  );
  return MyselfSchema.parseAsync(await response.json());
};
