const path = require("path");
const fs = require("fs");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
(async () => {
  const out = process.env.SCREENSHOT_DIR || path.join(__dirname, "screenshots");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-webgl"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    offline: true,
  });
  const page = await ctx.newPage();
  let errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("file://" + path.join(__dirname, "index.html"));
  const assert = (v, s) => {
    if (!v) throw Error(s);
  };
  for (let i = 0; i < 8; i++) {
    await page.selectOption("#index", String(i));
    await page.waitForTimeout(1400);
    assert(
      (await page.textContent("#position")) === `${i + 1} / 8`,
      "index mismatch",
    );
    await page.screenshot({ path: path.join(out, `desktop-${i}.png`) });
  }
  await page.selectOption("#index", "1");
  await page.click("#next");
  await page.click("#next");
  await page.click("#back");
  await page.waitForTimeout(1500);
  assert((await page.textContent("#position")) === "3 / 8", "rapid reverse");
  assert(
    (await page.locator("#art").textContent()).includes("NO SAVE"),
    "graphics stale",
  );
  await page.selectOption("#index", "5");
  await page.click("#pause");
  let first = await page.locator("#art").innerHTML();
  await page.waitForTimeout(300);
  assert(first === (await page.locator("#art").innerHTML()), "pause motion");
  await page.click("#replay");
  first = await page.locator("#art").innerHTML();
  await page.waitForTimeout(300);
  assert(
    first === (await page.locator("#art").innerHTML()),
    "replay while paused",
  );
  await page.click("#pause");
  await page.waitForTimeout(1500);
  await page.click("#evidence");
  assert(await page.locator("#drawer").evaluate((x) => x.open), "drawer");
  await page.keyboard.press("Escape");
  assert(
    await page
      .locator("#evidence")
      .evaluate((x) => x === document.activeElement),
    "focus restoration",
  );
  await page.locator("h1").click();
  await page.keyboard.press("End");
  assert((await page.textContent("#position")) === "8 / 8", "keyboard End");
  await page.keyboard.press("ArrowLeft");
  assert((await page.textContent("#position")) === "7 / 8", "keyboard left");
  await page.selectOption("#index", "0");
  await page.click("#begin");
  assert((await page.textContent("#position")) === "2 / 8", "Begin");
  await page.click("#tech");
  assert(await page.locator("#detail").isVisible(), "technical toggle");
  // Deterministically exercise the same browser visibilitychange listener used by hidden tabs.
  await page.selectOption("#index", "5");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  first = await page.locator("#art").innerHTML();
  await page.waitForTimeout(400);
  assert(
    first === (await page.locator("#art").innerHTML()),
    "visibility pause",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(1500);
  assert(
    first !== (await page.locator("#art").innerHTML()),
    "visibility resume",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.selectOption("#index", "1");
  first = await page.locator("#art").innerHTML();
  await page.waitForTimeout(300);
  assert(first === (await page.locator("#art").innerHTML()), "reduced motion");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#tech");
  for (const i of [0, 2, 4, 7]) {
    await page.selectOption("#index", String(i));
    await page.screenshot({
      path: path.join(out, `mobile-${i}.png`),
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "horizontal overflow",
    );
  }
  assert(errors.length === 0, "page errors");
  assert(
    requests.every((r) => r.startsWith("file:")),
    "network request",
  );
  const result = {
    browser: browser.version(),
    viewports: ["1440x1000", "390x844"],
    offline: true,
    webglDisabled: true,
    errors,
    requests,
    passed: [
      "all 8 scenes",
      "rapid and reversed navigation",
      "pause",
      "replay while paused",
      "Begin",
      "scene selector",
      "End/ArrowLeft",
      "evidence and Escape focus restoration",
      "technical detail",
      "visibility listener freeze/resume (simulated document.hidden)",
      "reduced motion",
      "mobile overflow",
    ],
    limits: [
      "OS-level hidden tab state was not exercised: document.hidden overridden for event-handler test.",
      "No WebGL renderer exists; SVG itself is the offline non-WebGL explanation.",
      "Keyboard arrows/space ignored on focused buttons by design; Tab/Enter remain available.",
    ],
  };
  fs.writeFileSync(
    path.join(__dirname, "browser-results.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
