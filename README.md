# gh-pr-listener

A tiny Deno webhook server that listens for GitHub pull request events and
posts notifications to a Slack channel, tagging the relevant author/reviewer.

## Install

Requires [Deno](https://deno.land/) (v1.40+ recommended).

```bash
git clone <repo-url>
cd gh-pr-listener
```

No separate install step is needed — Deno resolves dependencies (declared in
`deno.json`) on first run.

Start the dev server (auto-reloads on file changes):

```bash
deno task dev
```

Or run it directly:

```bash
deno run --allow-net --allow-env main.ts
```

The server listens on port `8000` and exposes a single webhook endpoint at
`/`.

## Configuring the Slack token

The server reads its Slack bot token from the `SLACK_TOKEN` environment
variable (see `main.ts`).

1. [Create a Slack app](https://api.slack.com/apps) (or reuse an existing one) with the `chat:write` scope,
   and install it to your workspace to get a bot token (starts with `xoxb-`).
2. Create a `.env` file in the project root:

   ```bash
   SLACK_TOKEN=xoxb-your-token-here
   ```

3. Run Deno with `--env-file` (or export the variable in your shell) so it's
   picked up:

   ```bash
   deno run --allow-net --allow-env --env-file main.ts
   ```

The bot also needs to be invited to the target Slack channel. The channel ID
is currently hardcoded in `main.ts` (`channel: "C08HZDDHK6H"`) — update it if
you want to post elsewhere.

### GitHub webhook setup

Point a GitHub repository/organization webhook at the deployed server's URL,
with content type `application/json`, subscribed to the `Pull request` and
`Pull request review` events.

## Deploying to Deno Deploy

[Deno Deploy](https://deno.com/deploy) can host this server directly from
the repo with zero build step.

1. Push this repository to GitHub.
2. In the [Deno Deploy dashboard](https://dash.deno.com/), create a new
   project and link it to the GitHub repo.
3. Set the entry point to `main.ts`.
4. Under the project's **Settings → Environment Variables**, add
   `SLACK_TOKEN` with your Slack bot token.
5. Deploy. Deno Deploy will give you a `https://<project>.deno.dev` URL —
   use that as the target for the GitHub webhook.

Alternatively, deploy from the CLI:

```bash
deno install -Arf jsr:@deno/deployctl
deployctl deploy --project=<your-project-name> main.ts
```

Set the `SLACK_TOKEN` environment variable for the project in the Deno
Deploy dashboard before (or after) the first deploy — it isn't read from a
local `.env` file in production.
