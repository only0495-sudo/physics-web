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

function decodeReference(value) {
  try { return decodeURIComponent(value.split(/[?#]/)[0]); } catch { return value; }
}

for (const name of htmlFiles) {
  const filePath = path.join(root, name);
  const html = fs.readFileSync(filePath, "utf8");
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
  const source = fs.readFileSync(path.join(root, name), "utf8");
  try { new vm.Script(source, { filename: name }); }
  catch (error) { errors.push(`${name}: JavaScript 語法錯誤：${error.message}`); }
}

if (warnings.length) console.log(`警告（${warnings.length}）：\n${warnings.join("\n")}`);
if (errors.length) {
  console.error(`檢查失敗（${errors.length}）：\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`檢查通過：${simulations.length} 個模擬、${activities.length} 份專屬量測指南、${paths.length} 條課程路徑、${appPages.size} 個系統頁面；所有本機連結與 JavaScript 語法正常。`);
}
