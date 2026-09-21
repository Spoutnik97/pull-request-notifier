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
deno run --allow-net --allow-env --allow-read --allow-sys main.ts
```

The server listens on the port set in your config (see below) and exposes a
single webhook endpoint at `/`.

## Configuration

All non-secret settings (port, Slack channel, GitHub-login → Slack-user-ID
mapping) live in a config file, not in the source.

1. Copy the example config and fill it in:

   ```bash
   cp config.example.json config.json
   ```

   ```json
   {
     "port": 8000,
     "slackChannel": "C0XXXXXXXXX",
     "loginMap": {
       "github-login": "SLACK_USER_ID"
     }
   }
   ```

   - `slackChannel`: the Slack channel ID to post PR notifications to. The
     bot must be invited to this channel.
   - `loginMap`: maps GitHub usernames to Slack user IDs, so authors/reviewers
     get `@`-mentioned instead of just named.

   `config.json` is gitignored — it's meant to hold your workspace-specific
   values and is never committed.

2. By default the server reads `./config.json`. To use a different path, set
   `CONFIG_PATH`. To pass the config inline instead of via a file (useful on
   platforms without filesystem access, like Deno Deploy), set the `CONFIG`
   env var to the JSON string directly — it takes priority over
   `CONFIG_PATH`.

## Configuring the Slack token

The server reads its Slack bot token from the `SLACK_TOKEN` environment
variable (see `main.ts`) — this stays a secret/env var, not part of the
config file.

1. [Create a Slack app](https://api.slack.com/apps) (or reuse an existing one) with the `chat:write` scope,
   and install it to your workspace to get a bot token (starts with `xoxb-`).
2. Create a `.env` file in the project root:

   ```bash
   SLACK_TOKEN=xoxb-your-token-here
   ```

3. Run Deno with `--env-file` (or export the variable in your shell) so it's
   picked up:

   ```bash
   deno run --allow-net --allow-env --allow-read --allow-sys --env-file main.ts
   ```

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
4. Under the project's **Settings → Environment Variables**, add:
   - `SLACK_TOKEN` — your Slack bot token.
   - `CONFIG` — the contents of your `config.json` as a single-line JSON
     string (since `config.json` is gitignored and won't be deployed with
     the repo, e.g. `{"port":8000,"slackChannel":"C0XXXXXXXXX","loginMap":{"github-login":"SLACK_USER_ID"}}`).
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
