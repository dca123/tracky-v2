import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const jiraRouter = createTRPCRouter({
  issues: publicProcedure.query(async () => getIssues()),
});

export const getIssues = async () => {
  const api =
    "search?jql=assignee = 'Devinda Senanayaka' AND (created >= startOfYear())";
  const response = await fetch(
    `https://parklaneit.atlassian.net/rest/api/3/${api}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `devinda.senanayaka@parklane.com.au:${env.JIRA}`
        ).toString("base64")}`,
        Accept: "application/json",
      },
    }
  );
  const parsedReponse = IssuesSchema.parse(await response.json());
  return parsedReponse.issues;
};

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
