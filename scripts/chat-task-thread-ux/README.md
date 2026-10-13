# fix/chat-task-thread-and-composer — browser test harness

This sandbox has no reachable MongoDB (no mongod binary; fastdl.mongodb.org /
repo.mongodb.org are blocked by the agent-proxy egress allowlist — the same
limitation noted on earlier branches this session), so the real backend
can't be booted for an end-to-end pass. This harness exercises the **real**
frontend code (`useChat.js`, `ChatPage.jsx`, the "Message" button navigation
in `ManageTasks.jsx`/`DoerChecklist.jsx`) against a small in-memory fake of
just the HTTP endpoints they call (`mock-server.mjs`), with two distinct
logged-in users (an assigner and a doer), run in an actual Chromium browser
via Playwright.

It is a test aid, not a replacement for running this against the real
backend + a real browser session before deploying.

## Run it

From the repo root:

```bash
npm install --no-save playwright express cors   # if not already present
npx esbuild scripts/chat-task-thread-ux/harness-entry.jsx --bundle \
  --loader:.js=jsx --jsx=automatic \
  --outfile=scripts/chat-task-thread-ux/bundle.js \
  --define:import.meta.env='{"VITE_API_URL":"http://localhost:5900/api"}'

node scripts/chat-task-thread-ux/mock-server.mjs &
node scripts/chat-task-thread-ux/static-server.mjs scripts/chat-task-thread-ux 5901 &

node scripts/chat-task-thread-ux/browser-test.mjs
```

`browser-test.mjs` launches Chromium (point `executablePath` at your own
Chromium install if `/opt/pw-browsers/...` doesn't exist on your machine)
and checks, in order: clicking "Message" as the assigner lands on
`/dashboard/chat?conv=<id>` without a full page reload; the task details
card (title, revised deadline, assigned-by → assigned-to) renders; a
message can be sent; clicking "Message" as the doer lands in the **same**
thread and sees the assigner's message; a hard refresh directly on the
thread URL still opens the right conversation; the composer is fully
visible above a sticky footer at desktop width; and at phone width the
thread view and its back-to-list button work correctly. It writes
screenshots (`1-details-card.png`, `2-hard-refresh-still-open.png`,
`3-composer-with-footer.png`, `4-phone-width.png`) into this folder and
exits non-zero if anything failed.
