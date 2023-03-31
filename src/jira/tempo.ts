import { myself } from "./jira.js";

export const createWorklog = async ({
  issueId,
  startDate,
  startTime = "08:00:00",
  timeSpentSeconds,
  description,
  account = "KPMG-FUNDS",
}: {
  issueId: number;
  startDate: string;
  startTime?: string;
  timeSpentSeconds: number;
  description: string;
  account?: "KPMG-FUNDS" | "INTERNAL";
}) => {
  const log = await tempoRequest("worklogs", "POST", {
    authorAccountId: myself.accountId,
    issueId,
    startDate,
    startTime,
    timeSpentSeconds,
    description,
    attributes: [
      {
        key: "_Account_",
        value: account,
      },
    ],
  });
  if (process.env.DEBUG) {
    console.debug(await log.json());
  }
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
