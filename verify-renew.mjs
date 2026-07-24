import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith(".html"));
const appPages = new Set(["index.html", "lesson.html", "notebook.html", "compare.html"]);
const simulations = htmlFiles.filter((name) => !appPages.has(name));
const errors = [];
const warnings = [];
const renewRoot = path.resolve(root, "..", "Renew");
const strictUtf8 = new TextDecoder("utf-8", { fatal: true });
const suspiciousMojibake = /\uFFFD|Ã|Â|â€|â€™|â€œ|â€|ðŸ|ï¸|ï¼|æœ|çš|å­|é€™|ä¸/;

function decodeReference(value) {
  try { return decodeURIComponent(value.split(/[?#]/)[0]); } catch { return value; }
}

for (const name of htmlFiles) {
  const filePath = path.join(root, name);
  let html = "";
  try { html = strictUtf8.decode(fs.readFileSync(filePath)); }
  catch { errors.push(`${name}: 不是有效的 UTF-8 檔案`); continue; }
  if (!/<meta\s+charset=["']?utf-8/i.test(html)) errors.push(`${name}: 缺少 UTF-8 charset 宣告`);
  if (suspiciousMojibake.test(html)) errors.push(`${name}: 含有疑似亂碼或替代字元`);
  if (/(?:fillStyle|strokeStyle)\s*=\s*["']var\(--/.test(html) || /drawArrow\([^\n]*["']var\(--/.test(html)) {
    errors.push(`${name}: Canvas 使用無法解析的 CSS var() 色值`);
  }
  if (!/<meta\s+name=["']viewport["']/i.test(html)) errors.push(`${name}: 缺少 viewport`);
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html)) errors.push(`${name}: 仍鎖定縮放`);

  if (!appPages.has(name)) {
    for (const asset of ["classroom-device.js", "classroom-shell.css", "classroom-data.js", "classroom-shell.js"]) {
      if (!html.includes(asset)) errors.push(`${name}: 缺少 ${asset}`);
    }
    const viewportIndex = html.search(/<meta\s+name=["']viewport["']/i);
    const deviceIndex = html.indexOf("classroom-device.js");
    const shellIndex = html.indexOf("classroom-shell.js");
    if (!(viewportIndex >= 0 && deviceIndex > viewportIndex && shellIndex > deviceIndex)) {
      errors.push(`${name}: 載具辨識程式必須在 viewport 後、教學外殼前載入`);
    }
  }

  const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of refs) {
    if (/^(?:https?:|data:|blob:|javascript:|#|mailto:|tel:)/i.test(reference)) continue;
    const local = decodeReference(reference);
    if (local && !fs.existsSync(path.join(root, local))) errors.push(`${name}: 找不到連結 ${local}`);
  }

  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    const attributes = match[1];
    let source = match[2].trim();
    if (/\bsrc\s*=/i.test(attributes) || /type=["'](?:application\/json|importmap)["']/i.test(attributes) || !source) return;
    if (/type=["']module["']/i.test(attributes)) source = source.replace(/^\s*import\s+.*?;\s*$/gm, "");
    try { new vm.Script(source, { filename: `${name}:script-${index + 1}` }); }
    catch (error) {
      const location = String(error.stack || "").split("\n").slice(0, 4).join(" | ");
      errors.push(`${name}: JavaScript 語法錯誤：${error.message}${location ? `（${location}）` : ""}`);
    }
  });
}

const catalogSource = fs.readFileSync(path.join(root, "classroom-data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
new vm.Script(catalogSource, { filename: "classroom-data.js" }).runInContext(context);
const activities = context.window.PhysicsClassroom?.activities || [];
const catalogFiles = activities.map((item) => item.file);
if (activities.length !== simulations.length) errors.push(`教學資料 ${activities.length} 筆，但模擬共有 ${simulations.length} 個`);
if (new Set(catalogFiles).size !== catalogFiles.length) errors.push("教學資料有重複檔名");
for (const name of simulations) if (!catalogFiles.includes(name)) errors.push(`${name}: 缺少教學資料`);
for (const name of catalogFiles) if (!simulations.includes(name)) errors.push(`${name}: 教學資料指向不存在頁面`);

const measureFields = ["settingLabel", "settingPlaceholder", "resultLabel", "resultPlaceholder", "prompt"];
for (const item of activities) {
  for (const field of measureFields) {
    if (!item.measure?.[field]?.trim()) errors.push(`${item.file}: 量測表缺少 ${field}`);
  }
  if (item.measure?.settingLabel === "本次控制條件") errors.push(`${item.file}: 仍在使用未核對的通用量測欄位`);
}

const motionGraph = activities.find((item) => item.file === "運動函數圖.html");
const motionMeasureCopy = motionGraph ? Object.values(motionGraph.measure || {}).join(" ") : "";
if (/角度/.test(motionMeasureCopy)) errors.push("運動函數圖: 量測紀錄仍含與本實驗無關的角度欄位");

if (fs.existsSync(renewRoot)) {
  const unchanged = simulations.filter((name) => {
    const sourcePath = path.join(renewRoot, name);
    return fs.existsSync(sourcePath) && fs.readFileSync(sourcePath, "utf8") === fs.readFileSync(path.join(root, name), "utf8");
  });
  if (unchanged.length) errors.push(`仍有 ${unchanged.length} 個模擬未進行 R 版個別修改：${unchanged.join("、")}`);
}

const shellSource = fs.readFileSync(path.join(root, "classroom-shell.js"), "utf8");
for (const marker of ["pc-clarity-mode", "pc-focus-card", "dataset.physicsDevice", "PhysicsDeviceLayout", "pc-orientation-guard", "pc-mobile-view-switch", "pc-mobile-aux-hidden", "Alt+C", "Alt+K"]) {
  if (!shellSource.includes(marker)) errors.push(`課堂顯示層缺少功能標記：${marker}`);
}

const deviceSource = fs.readFileSync(path.join(root, "classroom-device.js"), "utf8");
for (const marker of ["PHONE_LAYOUT_WIDTH = 1320", "TABLET_LAYOUT_WIDTH = 1180", "COMPACT_LAYOUT_HEIGHT = 680", "physicsLayout", "physicsOrientation", "physicsViewport", "physicsEmbedded", "visualViewport", "renderPixelRatio", "user-scalable=yes"]) {
  if (!deviceSource.includes(marker)) errors.push(`載具縮放層缺少功能標記：${marker}`);
}

const shellCssSource = fs.readFileSync(path.join(root, "classroom-shell.css"), "utf8");
for (const marker of ["data-physics-layout=\"fitted\"", "data-physics-orientation=\"landscape\"", "data-physics-viewport=\"compact\"", "pc-mobile-view-switch", "pc-mobile-aux-visible", "pc-orientation-guard", "data-physics-page=\"摩擦\"", "data-physics-page=\"黑體輻射\""]) {
  if (!shellCssSource.includes(marker)) errors.push(`橫向介面樣式缺少功能標記：${marker}`);
}

function evaluateDeviceLayout({ width, height, screenWidth = width, screenHeight = height, ua, platform = "", touchPoints = 0, coarse = false, mobile = false, embedded = false }) {
  const meta = {
    content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
    getAttribute(name) { return name === "content" ? this.content : ""; },
    setAttribute(name, value) { if (name === "content") this.content = value; }
  };
  const rootElement = {
    dataset: {},
    style: { values: {}, setProperty(name, value) { this.values[name] = value; } }
  };
  const landscape = width >= height;
  const mediaQuery = (query) => ({
    matches: query.includes("orientation") ? landscape : (query.includes("pointer") ? coarse : false),
    addEventListener() {},
    addListener() {}
  });
  const windowMock = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 3,
    screen: { width: screenWidth, height: screenHeight },
    matchMedia: mediaQuery,
    setTimeout() {},
    clearTimeout() {},
    addEventListener() {},
    dispatchEvent() {},
    visualViewport: { addEventListener() {} }
  };
  windowMock.self = {};
  windowMock.top = embedded ? {} : windowMock.self;
  const context = {
    window: windowMock,
    document: { documentElement: rootElement, querySelector: () => meta },
    navigator: { userAgent: ua, platform, maxTouchPoints: touchPoints, userAgentData: { mobile } },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; }
  };
  vm.createContext(context);
  new vm.Script(deviceSource, { filename: "classroom-device.js" }).runInContext(context);
  return { profile: windowMock.PhysicsDeviceLayout.profile, dataset: rootElement.dataset, viewport: meta.content };
}

const deviceCases = [
  {
    label: "橫向手機",
    result: evaluateDeviceLayout({ width: 844, height: 390, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile", platform: "iPhone", touchPoints: 5, coarse: true, mobile: true }),
    expected: { type: "phone", orientation: "landscape", fitted: true, compact: true, embedded: false, width: "width=1320", pixelRatio: 1 }
  },
  {
    label: "Google Sites 內嵌橫向手機",
    result: evaluateDeviceLayout({ width: 560, height: 220, screenWidth: 844, screenHeight: 390, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile", platform: "iPhone", touchPoints: 5, coarse: true, mobile: true, embedded: true }),
    expected: { type: "phone", orientation: "landscape", fitted: true, compact: true, embedded: true, width: "width=1320", pixelRatio: 1 }
  },
  {
    label: "橫向平板",
    result: evaluateDeviceLayout({ width: 1024, height: 768, ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", platform: "iPad", touchPoints: 5, coarse: true }),
    expected: { type: "tablet", orientation: "landscape", fitted: true, compact: false, embedded: false, width: "width=1180", pixelRatio: 1.5 }
  },
  {
    label: "電腦",
    result: evaluateDeviceLayout({ width: 1440, height: 900, ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" }),
    expected: { type: "desktop", orientation: "landscape", fitted: false, compact: false, embedded: false, width: "width=device-width", pixelRatio: 2 }
  },
  {
    label: "直向手機",
    result: evaluateDeviceLayout({ width: 390, height: 844, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile", platform: "iPhone", touchPoints: 5, coarse: true, mobile: true }),
    expected: { type: "phone", orientation: "portrait", fitted: false, compact: false, embedded: false, width: "width=device-width", pixelRatio: 1 }
  }
];

for (const test of deviceCases) {
  const { profile } = test.result;
  const expected = test.expected;
  if (profile.type !== expected.type || profile.orientation !== expected.orientation || profile.fitted !== expected.fitted || profile.compact !== expected.compact || profile.embedded !== expected.embedded || profile.renderPixelRatio !== expected.pixelRatio || !test.result.viewport.includes(expected.width)) {
    errors.push(`${test.label}: 載具辨識或橫向縮放結果不正確`);
  }
}

const magnetLenzSource = fs.readFileSync(path.join(root, "冷次定律(磁鐵動).html"), "utf8");
if (!magnetLenzSource.includes("cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)")) {
  errors.push("冷次定律(磁鐵動): 磁力線箭頭未以圓錐 +Y 軸對準 N→S 曲線切線");
}
if (/cone\.lookAt\(pt\.clone\(\)\.add\(tangent\)\)/.test(magnetLenzSource)) {
  errors.push("冷次定律(磁鐵動): 仍使用會讓 ConeGeometry 箭頭軸向錯置的 lookAt");
}

const potentialSource = fs.readFileSync(path.join(root, "位能.html"), "utf8");
if (!potentialSource.includes("function drawVectorArrow") || !potentialSource.includes("'速度 v'")) {
  errors.push("位能: 缺少位置／速度向量呈現");
}
if (/高度 h =.*toFixed|速率 v =.*toFixed/.test(potentialSource)) {
  errors.push("位能: 仍以快速跳動的高度／速率數字作為物體旁主要呈現");
}
for (const marker of ["data-occlusion-role=\"chart\"", "height: clamp(220px, 32dvh, 320px)", "chartTopInCanvas", "animationBottom", "function clampVerticalVector", "Math.min(state.groundY - 8"]) {
  if (!potentialSource.includes(marker)) errors.push(`位能: 缺少動畫／圖表防遮擋設定：${marker}`);
}
if (/canvas\.height\s*-\s*340|height:\s*340px/.test(potentialSource)) {
  errors.push("位能: 仍使用未扣除圖表實際邊界的固定動畫高度");
}

const magnetChartSource = fs.readFileSync(path.join(root, "冷次定律(磁鐵動).html"), "utf8");
if (!magnetChartSource.includes("togglePanel('chart-panel', this)")) {
  errors.push("冷次定律(磁鐵動): 覆蓋式即時圖表缺少收合控制");
}

const layeredLayoutAudits = [
  { file: "位能.html", markers: ["data-occlusion-role=\"chart\"", "chartTopInCanvas", "clampVerticalVector"] },
  { file: "冷次定律(磁鐵動).html", markers: ["togglePanel('chart-panel', this)"] },
  { file: "光電效應.html", markers: [".graph-container {", "display: none; /* 預設隱藏，由切換按鈕控制 */"] },
  { file: "碰撞.html", markers: ["#canvas-container {", "flex: 0 0 45vh", "#charts-container {"] },
  { file: "黑體輻射.html", markers: ["#graph-container {", "right: 360px; /* 留出右側面板空間 */"] },
  { file: "卡文迪西實驗裝置.html", markers: ["#graph-container {", "position: relative;"] }
];
for (const audit of layeredLayoutAudits) {
  const source = fs.readFileSync(path.join(root, audit.file), "utf8");
  for (const marker of audit.markers) {
    if (!source.includes(marker)) errors.push(`${audit.file}: 圖表／動畫分層檢查缺少標記：${marker}`);
  }
}

const compactOverlayAudits = [
  { file: "位能.html", marker: 'id="chart-container" data-occlusion-role="chart"', display: 'data-occlusion-display="block"' },
  { file: "冷次定律(磁鐵動).html", marker: 'id="chart-panel" data-occlusion-role="chart"', display: 'data-occlusion-display="block"' },
  { file: "卡文迪西實驗裝置.html", marker: 'id="graph-container" data-occlusion-role="chart"', display: 'data-occlusion-display="block"' },
  { file: "碰撞.html", marker: 'id="charts-container" data-occlusion-role="chart"', display: 'data-occlusion-display="flex"' },
  { file: "發電機.html", marker: 'id="oscilloscope" class="glass-panel" data-occlusion-role="chart"', display: 'data-occlusion-display="block"' },
  { file: "運動函數圖.html", marker: 'id="motion-graphs"', display: 'data-occlusion-display="grid"' },
  { file: "摩擦.html", marker: 'id="friction-chart-panel"', display: 'data-occlusion-display="block"' }
];
for (const audit of compactOverlayAudits) {
  const source = fs.readFileSync(path.join(root, audit.file), "utf8");
  if (!source.includes(audit.marker) || !source.includes(audit.display)) {
    errors.push(`${audit.file}: 短高度手機缺少動畫／圖表分離設定`);
  }
}

for (const marker of [
  "const isCompactPhoneLayout",
  "indexAxis: isCompactPhoneLayout() ? 'y' : 'x'",
  "state.animationBottom = Math.max(170, canvas.height - 18)",
  "if (!isCompactPhoneLayout())"
]) {
  if (!potentialSource.includes(marker)) errors.push(`位能: 手機緊湊版面缺少標記：${marker}`);
}

const shmSource = fs.readFileSync(path.join(root, "SHM.html"), "utf8");
for (const marker of ["function drawCanvasTag", "彈簧原長 L₀", "SHM_CANVAS_COLORS", "Microsoft JhengHei", "Noto Sans TC"]) {
  if (!shmSource.includes(marker)) errors.push(`SHM: 缺少清楚的繁中文字標籤設定：${marker}`);
}

// 向量箭頭回歸檢查：2D 箭身必須停在三角形底邊，文字不得壓在尖端；
// 自訂 3D 箭頭則讓圓柱／線段接到圓錐底面。Three.js ArrowHelper 本身已遵守此幾何規則。
const arrowAudits = [
  { file: "SHM.html", required: ["const baseX = toX - ux * headLen", "ctx.lineTo(baseX, baseY)", "ctx.strokeText(label, textX, textY)"], forbidden: ["ctx.lineTo(toX, toY); ctx.stroke()", "toX - w/2"] },
  { file: "位能.html", required: ["const baseX = endX - ux * headLength", "ctx.lineTo(baseX, baseY)"] },
  { file: "曲率半徑.html", required: ["const baseX = toX - ux * headLength", "ctx.lineTo(baseX, baseY)"] },
  { file: "正向力與視重.html", required: ["const lineEndX = toX - ux * headlen", "lineEndX - uy * headHalfWidth"] },
  { file: "摩擦.html", required: ["箭身與箭頭分開", "ctx.lineTo(shaftLength, 0)", "ctx.lineJoin = 'miter'"], forbidden: ["ctx.lineTo(shaftLength, -headWidth/2)"] },
  { file: "運動函數圖.html", required: ["const shaftEnd = arrowLength - direction * headSize", "ctx.closePath()"] },
  { file: "碰撞.html", required: ["ctx.lineTo((arrowLen - headLen) * dir, 0)"], forbidden: ["arrowLen - headLen + 1"] },
  { file: "圓周.html", required: ["const baseX = ex - ux * headLen", "ctx.lineTo(baseX, baseY)"] },
  { file: "等速圓周運動-錐動擺.html", required: ["const baseX = tipX - ux * headLen", "ctx.lineTo(baseX, baseY)"] },
  { file: "惠更斯原理.html", required: ["ctx.lineTo(x + 38, y)", "ctx.closePath()"], forbidden: ["ctx.lineTo(x + 52, y)"] },
  { file: "腳踏車的摩擦力.html", required: ["line(x1, y1, baseX, baseY)", "pg.line(x1, y1, baseX, baseY)", "pg.noStroke()"], forbidden: ["line(x1, y1, x2, y2)", "pg.line(x1, y1, x2, y2)"] },
  { file: "都卜勒效應.html", required: ["line(x, y, baseX, y)", "noStroke();\n            triangle("], forbidden: ["line(x, y, endX, y)"] },
  { file: "質重心.html", required: ["const shaftLength = mag - s", "triangle(0, s * 0.58"], forbidden: ["line(0,0, vec.x, vec.y)"] },
  { file: "波的折射、反射與全反射.html", required: ["const baseX = midX - ux * headlen", "ctx.closePath(); ctx.fill()"] },
  { file: "01圓形載流導線周圍磁場.html", required: ["const rShaftEnd = P.clone().addScaledVector(dir_r, -0.4)"] },
  { file: "帶電質點於磁場中運動.html", required: ["const shaftEnd = vec.copy().sub", "const coneCenter = vec.copy().sub", "cone(headRadius, headHeight)"] },
  { file: "冷次定律(磁鐵動).html", required: ["coneGeo.translate(6.25, 0, 0)", "setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)"] },
  { file: "發電機.html", required: ["head.position.copy(p1).addScaledVector(tangent, 1.0)"] },
  { file: "鉛質圓周運動.html", required: ["headGeom.translate(0, 0.5, 0)", "this.head.position.y = shaftLength"] }
];

for (const audit of arrowAudits) {
  const source = fs.readFileSync(path.join(root, audit.file), "utf8");
  for (const marker of audit.required || []) {
    if (!source.includes(marker)) errors.push(`${audit.file}: 箭頭缺少三角頭／底邊分離標記：${marker}`);
  }
  for (const marker of audit.forbidden || []) {
    if (source.includes(marker)) errors.push(`${audit.file}: 仍有箭身穿入尖端或多邊形箭頭：${marker}`);
  }
}

// 動態向量回歸檢查：量值接近零時，箭長、箭頭、線寬與文字必須連續縮放，
// 不可用固定最短箭長撐住畫面，再於門檻處整支消失。
const smoothVectorAudits = [
  {
    file: "位能.html",
    required: ["if (magnitude < 0.05)", "const visualScale = Math.min(1, magnitude / 30)", "Math.min(130, Math.abs(state.vY) * 0.18)", "ctx.globalAlpha = Math.min(1, magnitude / 22)"],
    forbidden: ["Math.max(34, Math.abs(state.vY)", "Math.abs(state.vY) > 1", "Math.max(12, magnitude * 0.2)"]
  },
  {
    file: "運動函數圖.html",
    required: ["Math.min(190, Math.abs(v) * 4)", "const headSize = Math.min(17, absoluteLength * 0.45)", "ctx.globalAlpha = Math.min(1, absoluteLength / 40)"],
    forbidden: ["Math.abs(v) < 0.5", "Math.max(28, Math.abs(v) * 4)", "Math.max(10, Math.abs(arrowLength)"]
  },
  {
    file: "碰撞.html",
    required: ["Math.min(160, Math.abs(v) * 16)", "const headLen = Math.min(14, arrowLen * 0.45)", "ctx.globalAlpha = Math.min(1, arrowLen / 32)"],
    forbidden: ["Math.max(Math.abs(v) * 16, 20)", "Math.abs(v) < 0.05", "Math.abs(disp_vcm) > 0.05"]
  },
  {
    file: "摩擦.html",
    required: ["Math.min(180, physics.velocity * 20)", "const shapeScale = Math.min(1, arrowLen / 36.4)", "ctx.globalAlpha = Math.min(1, arrowLen / 55)"],
    forbidden: ["Math.max(80, physics.velocity * 20)", "if (physics.velocity > 0.05)"]
  },
  {
    file: "SHM.html",
    required: ["if (len < 0.05)", "const preferredWidth =", "ctx.globalAlpha = Math.min(1, len / 20)"],
    forbidden: ["if (len < 1)", "lineWidth = Math.max(5, lineWidth)"]
  },
  {
    file: "都卜勒效應.html",
    required: ["if (Math.abs(velocity) < 0.005)", "const absoluteLength = Math.abs(length)", "drawingContext.globalAlpha = Math.min(1, absoluteLength / 28)"],
    forbidden: ["if (Math.abs(velocity) < 0.5)"]
  },
  {
    file: "圓周.html",
    required: ["const headLength = Math.min(3.2 * scale, len * 0.36)", "label.material.opacity = Math.min(1, len / (4 * scale))", "if(len < 0.05)"],
    forbidden: ["if(len<0.1)", "Math.max(1.2*scale, len*0.24)"]
  },
  {
    file: "等速圓周運動-錐動擺.html",
    required: ["updateArrow('Fc', bobPos, dirFc, lenFc)", "const headLength = Math.min(2.8, len * 0.38)", "lbl.element.style.opacity"],
    forbidden: ["arrFc.setLength(Math.max(1, lenFc))", "arr.setLength(Math.max(1, len))"]
  },
  {
    file: "正向力與視重.html",
    required: ["const actualWidth = Math.max(0.35, Math.min(width, length * 0.18))", "ctx.globalAlpha = Math.min(1, length / 20)"],
    forbidden: ["Math.abs(stateElevator.a) > 0.05) drawArrow"]
  },
  {
    file: "曲率半徑.html",
    required: ["const visualScale = Math.min(1, length / 30)", "ctx.globalAlpha = Math.min(1, length / 24)"],
    forbidden: ["if (length < 2) return"]
  },
  {
    file: "腳踏車的摩擦力.html",
    required: ["if (arrowLength < 0.05)", "drawingContext.globalAlpha = min(1, arrowLength / 24)", "pg.drawingContext.globalAlpha = min(1, arrowLength / 24)"],
    forbidden: ["if (arrowLength < 2) return"]
  },
  {
    file: "發電機.html",
    required: ["const vecLen = power * 8", "const loopScale = power * 1.2", "iLabelSprite.material.opacity"],
    forbidden: ["Math.max(0.01, power * 8)", "if (absV > 0.1)", "0.1 + power * 1.1"]
  },
  {
    file: "電動機.html",
    required: ["const currentLength = 5 * Math.min(1, Math.abs(I) / 5)", "const forceLength = Math.min(5, Math.abs(I*B)*0.25)", "const forceHead = Math.min(1.5, forceLength * 0.35)"],
    forbidden: ["Math.max(2.4, Math.min(5, Math.abs(I*B)*0.25))"]
  },
  {
    file: "冷次定律(磁鐵動).html",
    required: ["vLabel.material.opacity = Math.min(1, Math.abs(displayV) / 0.5)", "const arrowScale = intensity * 1.3", "inducedBArrow.scale.setScalar(arrowScale)"],
    forbidden: ["inducedBArrow.scale.set(0.5 + intensity*0.8"]
  },
  {
    file: "鉛質圓周運動.html",
    required: ["const heightLength = targetY - 0.5", "const vectorLength = v * 0.3", "const headLength = Math.min(0.6, vectorLength * 0.4)"],
    forbidden: ["velocityArrow.setLength(Math.max(0.1, v * 0.3)", "releaseHeightArrow.setLength(Math.max(0.1"]
  }
];

for (const audit of smoothVectorAudits) {
  const source = fs.readFileSync(path.join(root, audit.file), "utf8");
  for (const marker of audit.required || []) {
    if (!source.includes(marker)) errors.push(`${audit.file}: 動態向量缺少連續縮放標記：${marker}`);
  }
  for (const marker of audit.forbidden || []) {
    if (source.includes(marker)) errors.push(`${audit.file}: 仍有固定最短箭長或門檻跳變：${marker}`);
  }
}

// 沙漏模式回歸檢查：三個階段都必須先預測才啟動，右側同步繪製 N-t 圖，
// 且讀數依序呈現
// 開始時 N<W、穩定流動 N≈W、尾端短暫 N>W、靜止後 N=W。
const hourglassSource = fs.readFileSync(path.join(root, "正向力與視重.html"), "utf8");
const hourglassMarkers = [
  'id="btn-mode-hourglass"',
  'id="hourglass-prediction"',
  'data-hourglass-answer="heavier"',
  'data-hourglass-answer="lighter"',
  'data-hourglass-answer="same"',
  "id: 'starting'",
  "id: 'steady'",
  "id: 'ending'",
  "starting: 'lighter'",
  "steady: 'same'",
  "ending: 'heavier'",
  "function hourglassQuizComplete",
  "stateHourglass.questionIndex < hourglassQuestions.length - 1",
  "window.submitHourglassPrediction",
  "function getHourglassMetrics",
  "stateHourglass.running = true",
  'id="overlay-hourglass-graph"',
  'id="canvas-hourglass-nt"',
  "function drawHourglassGraph",
  "stateHourglass.history.push",
  "glassMass: 100 / GRAVITY - 4",
  "openingDelay: 0.65",
  "playbackRate: 0.72",
  "const earliestReleaseTime = Math.max(0, metrics.flowTime - HOURGLASS.fallTime)",
  "const latestReleaseTime = Math.min(metrics.flowTime, HOURGLASS.flowDuration)",
  "const fallProgress = Math.pow(clamp01(age / HOURGLASS.fallTime), 2)",
  'class="hourglass-explain-table"',
  'data-hourglass-stage="starting"',
  'data-hourglass-stage="steady"',
  'data-hourglass-stage="ending"',
  "function updateHourglassTableHighlight",
  "讀數＝沙漏向下壓秤面的力",
  "正在空中下落的砂還沒壓到沙漏底部"
];
for (const marker of hourglassMarkers) {
  if (!hourglassSource.includes(marker)) errors.push(`正向力與視重.html: 沙漏模式缺少必要流程：${marker}`);
}

if (hourglassSource.includes("const progress = (i / 22")) {
  errors.push("正向力與視重.html: 沙漏仍以整條循環砂流繪製，缺少由上往下移動的落砂前緣");
}
for (const advancedTerm of ["把整個沙漏視為系統", "動量傳遞", "N - W = M a₍CM₎"]) {
  if (hourglassSource.includes(advancedTerm)) {
    errors.push(`正向力與視重.html: 沙漏解釋仍含不適合高一初學者的說法：${advancedTerm}`);
  }
}

const hourglassTest = { g: 9.8, glass: 100 / 9.8 - 4, sand: 4, opening: 0.65, duration: 5.4, fall: 0.72, ramp: 0.22 };
const hourglassBaseline = (hourglassTest.glass + hourglassTest.sand) * hourglassTest.g;
if (Math.abs(hourglassBaseline - 100) > 1e-9) errors.push("沙漏物理：靜止時總重量不是 100 N");
const testSmoothstep = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const testHourglassReading = (time) => {
  const flowTime = Math.max(0, time - hourglassTest.opening);
  const q = hourglassTest.sand / hourglassTest.duration;
  const released = q * Math.min(flowTime, hourglassTest.duration);
  const landed = q * Math.max(0, Math.min(flowTime - hourglassTest.fall, hourglassTest.duration));
  const upper = hourglassTest.sand - released;
  const lower = landed;
  const landingEndTime = hourglassTest.duration + hourglassTest.fall;
  const landingStart = testSmoothstep((flowTime - hourglassTest.fall) / hourglassTest.ramp);
  const landingEnd = 1 - testSmoothstep((flowTime - (landingEndTime - hourglassTest.ramp)) / hourglassTest.ramp);
  const impact = q * hourglassTest.g * hourglassTest.fall * Math.max(0, Math.min(landingStart, landingEnd));
  return (hourglassTest.glass + upper + lower) * hourglassTest.g + impact;
};
const hourglassReadings = {
  ready: testHourglassReading(0.3),
  start: testHourglassReading(hourglassTest.opening + 0.36),
  steady: testHourglassReading(hourglassTest.opening + 2),
  ending: testHourglassReading(hourglassTest.opening + 5.65),
  complete: testHourglassReading(hourglassTest.opening + 6.12)
};
if (Math.abs(hourglassReadings.ready - hourglassBaseline) > 0.05) errors.push("沙漏物理：開閥前的讀數不是原重量");
if (!(hourglassReadings.start < hourglassBaseline - 0.5)) errors.push("沙漏物理：剛開始漏砂時讀數沒有變少");
if (Math.abs(hourglassReadings.steady - hourglassBaseline) > 0.05) errors.push("沙漏物理：穩定流動時讀數沒有回到基準附近");
if (!(hourglassReadings.ending > hourglassBaseline + 0.5)) errors.push("沙漏物理：尾端落砂時缺少短暫上衝");
if (Math.abs(hourglassReadings.complete - hourglassBaseline) > 0.05) errors.push("沙漏物理：所有砂靜止後沒有回到原重量");
const earlyFrontProgress = Math.pow(0.18 / hourglassTest.fall, 2);
const endingTopGap = Math.pow(0.2 / hourglassTest.fall, 2);
if (!(earlyFrontProgress > 0 && earlyFrontProgress < 0.2)) errors.push("沙漏動畫：第一批砂粒沒有從頸口逐步向下移動");
if (!(endingTopGap > 0)) errors.push("沙漏動畫：停止放砂後，砂流上端沒有形成向下移動的空隙");

const paths = context.window.PhysicsClassroom?.paths || [];
if (!paths.length) errors.push("缺少主題課程路徑");
if (new Set(paths.map((item) => item.id)).size !== paths.length) errors.push("主題課程路徑有重複 id");
for (const lessonPath of paths) {
  if (!lessonPath.title || !lessonPath.question || !lessonPath.duration) errors.push(`${lessonPath.id || "未命名路徑"}: 課程資訊不完整`);
  if (!Array.isArray(lessonPath.files) || lessonPath.files.length < 2) errors.push(`${lessonPath.id || "未命名路徑"}: 至少需要兩個模擬`);
  for (const file of lessonPath.files || []) {
    if (!catalogFiles.includes(file)) errors.push(`${lessonPath.id}: 路徑指向不存在的模擬 ${file}`);
  }
}

const jsFiles = fs.readdirSync(root).filter((name) => name.endsWith(".js"));
for (const name of jsFiles) {
  let source = "";
  try { source = strictUtf8.decode(fs.readFileSync(path.join(root, name))); }
  catch { errors.push(`${name}: 不是有效的 UTF-8 檔案`); continue; }
  if (suspiciousMojibake.test(source)) errors.push(`${name}: 含有疑似亂碼或替代字元`);
  try { new vm.Script(source, { filename: name }); }
  catch (error) {
    const location = String(error.stack || "").split("\n").slice(0, 3).join(" | ");
    errors.push(`${name}: JavaScript 語法錯誤：${error.message}${location ? `（${location}）` : ""}`);
  }
}

const cssFiles = fs.readdirSync(root).filter((name) => name.endsWith(".css"));
for (const name of cssFiles) {
  let source = "";
  try { source = strictUtf8.decode(fs.readFileSync(path.join(root, name))); }
  catch { errors.push(`${name}: 不是有效的 UTF-8 檔案`); continue; }
  if (suspiciousMojibake.test(source)) errors.push(`${name}: 含有疑似亂碼或替代字元`);
}

if (warnings.length) console.log(`警告（${warnings.length}）：\n${warnings.join("\n")}`);
if (errors.length) {
  console.error(`檢查失敗（${errors.length}）：\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`physics-web 檢查通過：${simulations.length} 個模擬、${deviceCases.length} 種載具／方向情境、${layeredLayoutAudits.length} 組圖表／動畫分層檢查、${compactOverlayAudits.length} 組短高度手機圖表切換、1 組沙漏三題預測／落砂前緣／N-t 圖／物理階段檢查、${activities.length} 份專屬量測指南、${paths.length} 條課程路徑、${arrowAudits.length} 組自訂箭頭幾何檢查、${smoothVectorAudits.length} 組動態向量連續性檢查、${appPages.size} 個系統頁面；UTF-8 文字、Canvas 色值、本機連結與 JavaScript 語法皆正常。`);
}
