import { z } from "zod";

const IssueCache = new Map();

const IssueSchema = z
  .object({
    key: z.string(),
    id: z.string(),
    fields: z.object({
      summary: z.string(),
      parent: z
        .object({
          fields: z.object({
            summary: z.string(),
          }),
        })
        .optional(),
    }),
  })
  .transform((issue) => {
    const { fields, ...rest } = issue;
    return {
      ...rest,
      title: fields.summary,
      epic: fields.parent?.fields.summary,
    };
  });

const IssuesSchema = z.object({
  issues: z.array(IssueSchema),
});
export type IssuesSchema = z.infer<typeof IssuesSchema>;

export const getIssues = async () => {
  if (IssueCache.get("issues")) {
    return IssueCache.get("issues") as z.infer<typeof IssuesSchema>;
  }
  const response = await jiraRequest(
    "search?jql=assignee = 'Devinda Senanayaka' AND (created >= startOfYear() AND resolutiondate <= endOfWeek() OR updated >= startOfWeek())"
  );
  const data = await response.json();
  const result = await IssuesSchema.parseAsync(data);
  IssueCache.set("issues", result);
  return result;
};

const jiraRequest = async (
  api: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
) => {
  if (!process.env.JIRA) {
    throw new Error("JIRA environment variable not set");
  }

  return fetch(`https://parklaneit.atlassian.net/rest/api/3/${api}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `devinda.senanayaka@parklane.com.au:${process.env.JIRA}`
      ).toString("base64")}`,
      Accept: "application/json",
    },
    method,
  });
};

const MyselfSchema = z.object({
  accountId: z.string(),
  emailAddress: z.string(),
  displayName: z.string(),
});

const getMyself = async () => {
  const response = await jiraRequest("myself");
  const data = await response.json();
  return MyselfSchema.parseAsync(data);
};

export const myself = await getMyself();
