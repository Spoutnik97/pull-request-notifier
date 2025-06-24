import { WebClient } from "npm:@slack/web-api";

const SLACK_TOKEN = Deno.env.get("SLACK_TOKEN") || "";

const slack = new WebClient(SLACK_TOKEN);

const loginMap = new Map<string, string>();
loginMap.set("karlmorisset", "U0751C4S43G");
loginMap.set("EtienneCmb", "U08281SGPND");
loginMap.set("Spoutnik97", "U051W1F01DL");
loginMap.set("MorganPeju", "U070BL26K1P");
loginMap.set("Picorba", "U092E1PJXN2");

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
    
    const requestedReviewerTag = `<@${loginMap.get(requestReviewer)}>`;
    const authorTag = `<@${loginMap.get(author)}>`;
    
    switch (event) {
      case "pull_request":
        if (body.action === "opened") {
          message = `🆕 New Pull Request opened by ${authorTag}:\n${body.pull_request.title}\n${body.pull_request.html_url}`;
        }
        if (body.action === "review_requested") {
          message =
            `🔄 Pull Request updated by ${authorTag}:\n${body.pull_request.title}\n${body.pull_request.html_url}. Requested review from ${requestedReviewerTag}`;
        }
        break;

      case "pull_request_review_request":
        message = `👀 Review requested from ${requestedReviewerTag} on PR:\n${body.pull_request.title}\n${body.pull_request.html_url}`;
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
        channel: "C08HZDDHK6H", // code-reviews
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}

const port = 8000;
console.log(`Webhook server running on port ${port}`);

Deno.serve({ port }, handleWebhook);
