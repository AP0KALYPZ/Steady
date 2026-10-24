import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = 9223;
const APP = process.env.STEADY_URL || "http://127.0.0.1:5173";
const OUT = path.resolve("docs/screenshots");
const PROFILE = path.resolve(".screenshot-profile");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pad = (n) => String(n).padStart(2, "0");
const key = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
today.setHours(12, 0, 0, 0);
const todayKey = key(today);
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return key(d);
};
const toKg = (lb) => +(lb / 2.2046226218).toFixed(3);

const templates = [
  {
    slot: 1,
    name: "Beef & eggs, revisited",
    ingredients: "Ribeye, four eggs, sharp cheddar",
    calories: 720,
    protein: 56,
    fat: 46,
  },
  {
    slot: 2,
    name: "Ribeye & butter",
    ingredients: "Ribeye steak, grass-fed butter",
    calories: 680,
    protein: 54,
    fat: 44,
  },
  {
    slot: 3,
    name: "Salmon & eggs",
    ingredients: "Salmon fillet, three eggs",
    calories: 560,
    protein: 46,
    fat: 32,
  },
  {
    slot: 4,
    name: "Greek yogurt & berries",
    ingredients: "Greek yogurt, blueberries, walnuts",
    calories: 310,
    protein: 24,
    fat: 12,
  },
  {
    slot: 5,
    name: "",
    ingredients: "",
    calories: null,
    protein: null,
    fat: null,
  },
  {
    slot: 6,
    name: "",
    ingredients: "",
    calories: null,
    protein: null,
    fat: null,
  },
];

const weighIns = [];
for (let offset = 60; offset >= 2; offset -= 4) {
  const progress = 60 - offset;
  const weight =
    184.5 -
    progress * 0.16 +
    Math.sin(progress * 1.7) * 0.42 +
    Math.cos(progress * 0.7) * 0.22;
  weighIns.push({
    date: addDays(-offset),
    weightKg: toKg(weight),
    updatedAt: `${addDays(-offset)}T07:20:00.000Z`,
  });
}
weighIns.push({
  date: todayKey,
  weightKg: toKg(174.8),
  updatedAt: `${todayKey}T07:18:00.000Z`,
});

const fastingDays = [-3, -10, -17, -24, -31, -45].map(addDays);
const fasting = new Set(fastingDays);
const meals = [];
for (let offset = 0; offset <= 45; offset += 1) {
  const date = addDays(-offset);
  if (fasting.has(date)) continue;
  if (offset > 0 && (offset * 7 + 3) % 11 === 0) continue;
  let count = 3;
  if (offset % 9 === 4 || offset % 13 === 6) count = 2;
  if (offset === 0) count = 2;
  for (let slot = 1; slot <= count; slot += 1) {
    const template = templates[slot - 1];
    meals.push({
      date,
      slot,
      loggedAt: `${date}T${["07:35", "12:40", "18:20"][slot - 1]}:00.000Z`,
      name: template.name,
      ingredients: template.ingredients,
      calories: template.calories,
      protein: template.protein,
      fat: template.fat,
    });
  }
}

const offPlanDays = [
  ...[-1, -2, -5, -8, -12, -15, -18, -22, -25, -29, -33, -36, -41].map(
    (offset) => ({ date: addDays(offset), status: "on" }),
  ),
  ...[-4, -11, -19, -27, -38].map((offset) => ({
    date: addDays(offset),
    status: "off",
  })),
].sort((a, b) => a.date.localeCompare(b.date));

const notes = new Map([
  [0, "Focused and steady. Long walk after lunch."],
  [-1, "Slept well. Meals felt easy and unhurried."],
  [-2, "Busy day, but the routine held."],
  [-3, "Full fasting day. Sparkling water, electrolytes, early night."],
  [-5, "Strong session at the gym. Hunger stayed quiet."],
  [-7, "Kept lunch simple. Energy was even all afternoon."],
  [-10, "Fasting day. Clear head, good focus."],
  [-13, "A slower morning, then back on plan."],
  [-17, "Fasting day. Walked by the river after work."],
]);

const snapshot = {
  settings: {
    unit: "lb",
    startWeightKg: toKg(184.5),
    goalWeightKg: toKg(150),
    sameMeal: false,
    mealsPerDay: 3,
    onboarded: true,
  },
  templates,
  weighIns,
  meals,
  offPlanDays,
  fastingDays,
  notes: [...notes].map(([offset, body]) => ({
    date: addDays(offset),
    body,
  })),
};

const profileArgs = [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--mute-audio",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  "about:blank",
];

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
}

async function waitForHttp(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Chrome is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const chrome = spawn(CHROME, profileArgs, { stdio: "ignore" });
let cdp;
try {
  await waitForHttp(`http://127.0.0.1:${PORT}/json/version`);
  const target = await fetch(
    `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(`${APP}/#/overview`)}`,
    { method: "PUT" },
  ).then((response) => response.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  cdp = new Cdp(ws);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(1000);

  const seedExpression = `localStorage.setItem("steady-desktop-browser-preview-v1", ${JSON.stringify(
    JSON.stringify(snapshot),
  )})`;
  await cdp.evaluate(seedExpression);
  await cdp.send("Page.reload");
  await sleep(1200);

  const prepare = `(() => {
    let style = document.getElementById("readme-shot-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "readme-shot-style";
      style.textContent = "html::-webkit-scrollbar{display:none!important}html{scrollbar-width:none!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
      document.head.appendChild(style);
    }
    for (const element of document.querySelectorAll("span")) {
      if (element.textContent.trim() === "Browser preview") element.style.display = "none";
    }
    for (const element of document.querySelectorAll("p")) {
      if (element.textContent.includes("STEADY PREVIEW") || element.textContent.includes("STEADY DESKTOP")) {
        element.innerHTML = "Private by design · saved on this device<br>STEADY DESKTOP / 1.0";
      }
    }
    for (const element of document.querySelectorAll("span")) {
      if (element.textContent.includes("Design preview: records are held in this browser")) {
        element.textContent = element.textContent
          .replace("Design preview: records are held in this browser. The installed desktop app uses local SQLite.", "Records are stored in a local SQLite database inside the app data folder. Nothing is uploaded.")
          .replace("Clearing app data or this browser will remove unexported records.", "Clearing app data will remove unexported records.");
      }
    }
    window.scrollTo(0, 0);
  })()`;

  const pages = [
    ["overview", "overview.png"],
    ["journal", "journal.png"],
    ["progress", "weight-progress.png"],
    ["meals", "meal-routine.png"],
    ["insights", "insights.png"],
    ["settings", "settings.png"],
  ];

  await mkdir(OUT, { recursive: true });
  for (const [route, filename] of pages) {
    await cdp.send("Page.navigate", { url: `${APP}/#/${route}` });
    await sleep(1000);
    await cdp.evaluate(prepare);
    // Measure against a short viewport so min-h-screen cannot pin the footer
    // to the previous page's height and leave a large empty tail.
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 700,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(250);
    await cdp.evaluate(prepare);
    const height = Math.min(
      Math.ceil(await cdp.evaluate("document.documentElement.scrollHeight")),
      2000,
    );
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(300);
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 1440, height, scale: 1 },
    });
    await writeFile(
      path.join(OUT, filename),
      Buffer.from(screenshot.data, "base64"),
    );
    console.log(`${filename} 1440x${height}`);
  }
} finally {
  if (cdp) cdp.ws.close();
  chrome.kill();
  await sleep(300);
  await rm(PROFILE, { recursive: true, force: true });
}
