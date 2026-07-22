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
    for (const asset of ["classroom-shell.css", "classroom-data.js", "classroom-shell.js"]) {
      if (!html.includes(asset)) errors.push(`${name}: 缺少 ${asset}`);
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
    catch (error) { errors.push(`${name}: JavaScript 語法錯誤：${error.message}`); }
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
for (const marker of ["pc-clarity-mode", "pc-focus-card", "dataset.physicsDevice", "Alt+C", "Alt+K"]) {
  if (!shellSource.includes(marker)) errors.push(`課堂顯示層缺少功能標記：${marker}`);
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
  catch (error) { errors.push(`${name}: JavaScript 語法錯誤：${error.message}`); }
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
  console.log(`R 版檢查通過：${simulations.length} 個模擬皆已個別修改、${activities.length} 份專屬量測指南、${paths.length} 條課程路徑、${arrowAudits.length} 組自訂箭頭回歸檢查、${appPages.size} 個系統頁面；UTF-8 文字、Canvas 色值、本機連結與 JavaScript 語法皆正常。`);
}
