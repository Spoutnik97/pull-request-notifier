import { WebClient } from "npm:@slack/web-api";

interface Config {
  port: number;
  slackChannel: string;
  loginMap: Record<string, string>;
}

async function loadConfig(): Promise<Config> {
  const inline = Deno.env.get("CONFIG");
  if (inline) {
    return JSON.parse(inline);
  }

  const path = Deno.env.get("CONFIG_PATH") || "./config.json";
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    throw new Error(
      `Could not load config from "${path}" (or a CONFIG env var). ` +
        `Copy config.example.json to config.json and fill it in. Original error: ${error}`,
    );
  }
}

const config = await loadConfig();

const SLACK_TOKEN = Deno.env.get("SLACK_TOKEN") || "";

const slack = new WebClient(SLACK_TOKEN);

const loginMap = new Map<string, string>(Object.entries(config.loginMap));

function slackTag(githubLogin: string | undefined): string {
  if (!githubLogin || !loginMap.has(githubLogin)) return githubLogin ?? "";
  return `<@${loginMap.get(githubLogin)}>`;
}

async function handleWebhook(request: Request) {
  try {
    if (request.method === "GET") {
      console.log("Received GET request");
      return new Response("OK", { status: 200 });
    }
    const body = await request.json();
    const event = request.headers.get("x-github-event");

    console.log(`Received webhook event: ${event}`);
    // console.log("Payload:", body);

    let message = "";

    const state = body?.review?.state;
    const emoji = state === "approved"
      ? "✅"
      : state === "changes_requested"
      ? "❌"
      : "💭";

    const requestReviewer: string = body?.requested_reviewer?.login;
    const author: string = body?.pull_request?.user?.login;
    const reviewer: string = body?.review?.user?.login;

    const requestedReviewerTag = slackTag(requestReviewer);
    const authorTag = slackTag(author);

    switch (event) {
      case "pull_request":
        if (body.action === "opened") {
          message =
            `🆕 New Pull Request opened by ${author}:\n${body.pull_request.title}\n${body.pull_request.html_url}`;
        }
        if (body.action === "review_requested") {
          message =
            `🔄 Pull Request updated by ${authorTag}:\n${body.pull_request.title}\n${body.pull_request.html_url}. Requested review from ${requestedReviewerTag}`;
        }
        break;

      case "pull_request_review_request":
        message =
          `👀 Review requested from ${requestedReviewerTag} on PR:\n${body.pull_request.title}\n${body.pull_request.html_url}`;
        break;

      case "pull_request_review":
        message =
          `${emoji} Review submitted by ${reviewer} on PR:\n${body.pull_request.title}\n${body.review.html_url}; cc ${authorTag}`;
        break;
    }

    if (message) {
      console.log("Message => ", message);
      await slack.chat.postMessage({
        text: message,
        channel: config.slackChannel,
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}

const port = config.port ?? 8000;
console.log(`Webhook server running on port ${port}`);

Deno.serve({ port }, handleWebhook);
