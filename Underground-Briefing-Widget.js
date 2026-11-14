// Underground Works Briefing – iPhone home-screen widget for the Scriptable app
// Shows today's headline (and, in larger sizes, the talking point and top entries).
// Tapping the widget opens the full briefing.
//
// SETUP: fill in your GitHub username and repository name below.
const GITHUB_USER = "YOUR-GITHUB-USERNAME";
const GITHUB_REPO = "underground-briefing";
const FEED_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/briefing.json`;
const APP_URL = "https://claude.ai/artifact/X8AZMAQGhafdF6Fb8MkS14";

// Colours: tunnel blue on dark slate, clay accent for the talking point.
const C = {
  bg: new Color("#11171c"),
  ink: new Color("#e4e9ec"),
  muted: new Color("#97a3ac"),
  accent: new Color("#6fb0dc"),
  soil: new Color("#d39a5c"),
};
const CAT_COLOURS = {
  "Tunnels": "#6fb0dc", "Immersed tunnels": "#5cc4c4", "Deep excavations": "#a68ad8",
  "Quay walls & waterfronts": "#d39a5c", "Underground parking": "#8cc070",
  "Foundations": "#bfae90", "Incidents & lessons": "#e57373", "Market & pipeline": "#97a3ac",
};

async function loadFeed() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "underground-briefing.json");
  try {
    const req = new Request(FEED_URL + "?t=" + Date.now());
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    if (data && data.headline) {
      fm.writeString(cache, JSON.stringify(data));
      return { data, stale: false };
    }
    throw new Error("Feed has no headline");
  } catch (e) {
    if (fm.fileExists(cache)) return { data: JSON.parse(fm.readString(cache)), stale: true };
    return { data: null, stale: true, error: String(e) };
  }
}

function fmtDate(d) {
  try {
    const df = new DateFormatter();
    df.dateFormat = "EEE d MMM";
    df.locale = "en_GB";
    return df.string(new Date(d + "T12:00:00"));
  } catch (e) { return d; }
}

function addText(stack, str, size, colour, weight = "regular", lines = 0) {
  const t = stack.addText(str);
  t.textColor = colour;
  t.font = weight === "bold" ? Font.boldSystemFont(size)
         : weight === "semibold" ? Font.semiboldSystemFont(size)
         : weight === "mono" ? Font.regularMonospacedSystemFont(size)
         : Font.systemFont(size);
  if (lines) t.lineLimit = lines;
  return t;
}

async function build() {
  const family = config.widgetFamily || "large";
  const { data, stale, error } = await loadFeed();
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = APP_URL;
  w.setPadding(14, 14, 12, 14);
  // Ask iOS to refresh in about an hour (iOS decides the exact time).
  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);

  const top = w.addStack();
  top.centerAlignContent();
  addText(top, "UNDERGROUND BRIEFING", 9, C.accent, "mono");
  top.addSpacer();
  if (data) addText(top, fmtDate(data.date) + (stale ? " · offline" : ""), 9, C.muted, "mono");
  w.addSpacer(6);

  if (!data) {
    addText(w, "No briefing yet", 15, C.ink, "semibold");
    w.addSpacer(4);
    addText(w, "Check GITHUB_USER and GITHUB_REPO at the top of the script.", 11, C.muted, "regular", 3);
    return w;
  }

  const headLines = family === "small" ? 6 : family === "medium" ? 3 : 4;
  addText(w, data.headline, family === "small" ? 13 : 15, C.ink, "semibold", headLines);

  if (family === "medium") {
    w.addSpacer(6);
    const items = (data.top || []).slice(0, 2);
    for (const it of items) {
      const row = w.addStack();
      row.centerAlignContent();
      const dot = row.addText("●");
      dot.font = Font.systemFont(8);
      dot.textColor = new Color(CAT_COLOURS[it.category] || "#97a3ac");
      row.addSpacer(5);
      addText(row, it.title, 11, C.muted, "regular", 1);
      w.addSpacer(2);
    }
  }

  if (family === "large" || family === "extraLarge") {
    if (data.talkingPoint) {
      w.addSpacer(10);
      addText(w, "TALKING POINT", 9, C.soil, "mono");
      w.addSpacer(2);
      addText(w, data.talkingPoint, 12, C.ink, "regular", 5);
    }
    w.addSpacer(10);
    addText(w, "TOP ENTRIES", 9, C.accent, "mono");
    w.addSpacer(3);
    for (const it of (data.top || []).slice(0, 4)) {
      const row = w.addStack();
      row.layoutHorizontally();
      const dot = row.addText("●");
      dot.font = Font.systemFont(9);
      dot.textColor = new Color(CAT_COLOURS[it.category] || "#97a3ac");
      row.addSpacer(6);
      const col = row.addStack();
      col.layoutVertically();
      addText(col, it.title, 12, C.ink, "regular", 2);
      addText(col, `${it.category} · ${it.country || ""}`, 9, C.muted, "mono", 1);
      w.addSpacer(5);
    }
  }
  w.addSpacer();
  return w;
}

const widget = await build();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();
