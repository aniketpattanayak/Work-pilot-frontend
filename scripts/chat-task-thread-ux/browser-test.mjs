import path from "node:path"; import { fileURLToPath } from "node:url"; const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { chromium } from 'playwright';

const dir = __dirname;
const BASE = 'http://localhost:5901';

const results = [];
function check(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass, detail: pass ? undefined : detail });
  console.log(pass ? 'PASS' : 'FAIL', '-', name, pass ? '' : String(detail).slice(0, 300));
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ───────────────────────────────────────────────────────────────────────────
// 1) Assigner clicks "Message" on the task row -> lands on the task's chat
//    thread, URL carries ?conv=, and NO full page reload happened.
// ───────────────────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(BASE + '/dashboard/manage-tasks');
  await page.waitForSelector("#message-btn", { timeout: 10000 });
  const markerBefore = await page.evaluate(() => window.__loadMarker);

  await page.click('#message-btn');
  await page.waitForSelector('text=Prepare Q3 report', { timeout: 5000 });
  await page.waitForTimeout(400);

  const url = page.url();
  check('clicking Message navigates to /dashboard/chat with ?conv=<id>', /\/dashboard\/chat\?conv=/.test(url), url);

  const markerAfter = await page.evaluate(() => window.__loadMarker);
  check('opener navigates WITHOUT a full page reload (in-memory marker survived)', markerBefore === markerAfter, { markerBefore, markerAfter });

  const navCount = await page.evaluate(() => window.__navCount);
  check('navigation went through history.pushState (SPA nav), not a hard navigation', navCount >= 1, navCount);

  const threadTitle = await page.textContent('body');
  check('the task thread (not "Select a conversation") is shown after clicking Message', !threadTitle.includes('Select a conversation'), threadTitle.slice(0, 200));

  check('the task details card is shown (title + revised + assigned by -> to)', threadTitle.includes('Prepare Q3 report') && threadTitle.includes('revised') && threadTitle.includes('Asha') && threadTitle.includes('Deepak'), threadTitle);

  await page.screenshot({ path: path.join(dir, '1-details-card.png') });

  // Send a message as the assigner.
  await page.click('textarea[placeholder="Type a message…"]');
  await page.fill('textarea[placeholder="Type a message…"]', 'Hello from assigner');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const afterSend = await page.textContent('body');
  check('assigner can send a message in the task thread', afterSend.includes('Hello from assigner'), afterSend.slice(0, 300));

  await page.close();
}

// ───────────────────────────────────────────────────────────────────────────
// 2) Doer clicks "Message" from their side -> lands in the SAME thread
//    (proves getOrCreateTaskThread's findOne({taskId}) reuse, from the
//    frontend's point of view), sees the assigner's message, replies.
// ───────────────────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(BASE + '/dashboard/manage-tasks?as=doer');
  await page.waitForSelector("#message-btn", { timeout: 10000 });
  await page.click('#message-btn');
  await page.waitForTimeout(500);
  const url = page.url();
  check('doer\'s click also lands on /dashboard/chat?conv=<id>', /\/dashboard\/chat\?conv=/.test(url), url);

  const body = await page.textContent('body');
  check('doer lands in the SAME thread and sees the assigner\'s earlier message', body.includes('Hello from assigner'), body.slice(0, 300));

  await page.fill('textarea[placeholder="Type a message…"]', 'Reply from doer');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const afterReply = await page.textContent('body');
  check('doer can reply in the thread', afterReply.includes('Reply from doer'), afterReply.slice(0, 300));
  await page.close();
}

// ───────────────────────────────────────────────────────────────────────────
// 3) Hard refresh directly on the thread URL -> the right chat still opens.
//    This is the core regression test for the bug: a REAL navigation (not
//    an in-SPA one) must still land on the right conversation.
// ───────────────────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(BASE + '/dashboard/chat?conv=conv-task-abc123');
  await page.waitForTimeout(700);
  const body = await page.textContent('body');
  check('a cold load / hard refresh directly on the thread URL opens the right conversation', body.includes('Prepare Q3 report') && !body.includes('Select a conversation'), body.slice(0, 300));
  await page.screenshot({ path: path.join(dir, '2-hard-refresh-still-open.png') });
  await page.close();
}

// ───────────────────────────────────────────────────────────────────────────
// 4) Composer fully visible with the (fake) sticky footer present, desktop.
// ───────────────────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(BASE + '/dashboard/chat?conv=conv-task-abc123');
  await page.waitForTimeout(600);
  const composer = page.locator('textarea[placeholder="Type a message…"]');
  const sendBtn = page.locator('button:has(svg)').last();
  const composerBox = await composer.boundingBox();
  const vh = 800;
  check('composer textarea is within the viewport (not pushed off the bottom)', composerBox && composerBox.y + composerBox.height <= vh, composerBox);
  // Footer element itself must be visible AND not overlapping the composer.
  const footerBox = await page.locator('text=Powered by LRBC (fake sticky footer)').boundingBox();
  check('the sticky footer is visible on the chat page (not hidden to make room)', !!footerBox, footerBox);
  check('the composer does not overlap the footer', composerBox && footerBox && (composerBox.y + composerBox.height) <= footerBox.y + 1, { composerBox, footerBox });
  await page.screenshot({ path: path.join(dir, '3-composer-with-footer.png') });
  await page.close();
}

// ───────────────────────────────────────────────────────────────────────────
// 5) Phone width: list/thread show one at a time, back button works, and
//    the composer is still fully visible above the footer.
// ───────────────────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
  await page.goto(BASE + '/dashboard/chat?conv=conv-task-abc123');
  await page.waitForTimeout(600);
  const body = await page.textContent('body');
  check('phone width: thread is shown (not the list) when a conv is in the URL', body.includes('Prepare Q3 report'), body.slice(0, 200));
  const composerBox = await page.locator('textarea[placeholder="Type a message…"]').boundingBox();
  check('phone width: composer is within the 700px-tall viewport', composerBox && composerBox.y + composerBox.height <= 700, composerBox);
  await page.screenshot({ path: path.join(dir, '4-phone-width.png') });

  // Back action -> conversation list, ?conv cleared.
  await page.click('button[title="Back to conversations"]');
  await page.waitForTimeout(300);
  const afterBack = await page.textContent('body');
  const urlAfterBack = page.url();
  check('phone width: back button returns to the conversation list', afterBack.includes('Messages') && !/conv=/.test(urlAfterBack), { afterBack: afterBack.slice(0, 150), urlAfterBack });
  await page.close();
}

await browser.close();

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed.`);
if (failed.length) { console.log('FAILURES:', JSON.stringify(failed, null, 2)); process.exitCode = 1; }
