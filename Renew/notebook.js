(function () {
  "use strict";

  const activities = window.PhysicsClassroom?.activities || [];
  const categories = (window.PhysicsClassroom?.categories || []).filter((item) => item !== "全部");
  const storage = {
    get(key, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } },
    remove(key) { try { localStorage.removeItem(key); } catch (_) { /* private mode */ } }
  };
  const state = { filter: "recorded", query: "" };
  const grid = document.getElementById("records-grid");
  const empty = document.getElementById("notebook-empty");
  const summary = document.getElementById("records-summary");
  const confidenceLabels = ["未評量", "還不確定", "有點懂了", "能夠說明", "能教別人"];
  let toastTimer;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
  }

  function parse(key, fallback = {}) {
    try { return JSON.parse(storage.get(key, JSON.stringify(fallback))); } catch (_) { return fallback; }
  }

  function recordFor(item) {
    const note = storage.get(`physics-note:${item.file}`, "");
    const progress = parse(`physics-progress:${item.file}`);
    const evidence = parse(`physics-evidence:${item.file}`);
    const trials = parse(`physics-trials:${item.file}`, []);
    const confidence = Number(storage.get(`physics-confidence:${item.file}`, "0"));
    const completed = storage.get(`physics-completed:${item.file}`, "");
    const measuredTrials = Array.isArray(trials) ? trials.filter((trial) => String(trial.setting || "").trim() || String(trial.result || "").trim()) : [];
    const hasRecord = Boolean(note.trim() || Object.values(progress).some(Boolean) || Object.values(evidence).some((value) => String(value).trim()) || measuredTrials.length || confidence || completed);
    return { ...item, note, progress, evidence, trials: measuredTrials, confidence, completed, hasRecord };
  }

  function allRecords() { return activities.map(recordFor); }

  function comparisonRecords() {
    const records = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith("physics-comparison:")) continue;
        const stored = parse(key);
        const pair = key.slice("physics-comparison:".length).split("|");
        const left = activities.find((item) => item.file === (stored.leftFile || pair[0]));
        const right = activities.find((item) => item.file === (stored.rightFile || pair[1]));
        if (!left || !right) continue;
        const fields = [stored.same, stored.change, stored["left-result"], stored["right-result"], stored.conclusion];
        if (!fields.some((value) => String(value || "").trim()) && !stored.completedAt) continue;
        records.push({ key, left, right, ...stored });
      }
    } catch (_) { /* private mode */ }
    return records.sort((a, b) => String(b.updatedAt || b.completedAt || "").localeCompare(String(a.updatedAt || a.completedAt || "")));
  }

  function visibleRecords() {
    const query = state.query.trim().toLocaleLowerCase("zh-TW");
    return allRecords().filter((item) => {
      if (state.filter === "recorded" && !item.hasRecord) return false;
      if (state.filter === "completed" && !item.completed) return false;
      if (!query) return true;
      return [item.title, item.category, item.summary, item.note, ...Object.values(item.evidence)].join(" ").toLocaleLowerCase("zh-TW").includes(query);
    });
  }

  function renderSummary() {
    const records = allRecords();
    const completed = records.filter((item) => item.completed).length;
    const recorded = records.filter((item) => item.hasRecord).length;
    const scores = records.map((item) => item.confidence).filter(Boolean);
    document.getElementById("completed-count").textContent = completed;
    document.getElementById("note-count").textContent = recorded;
    document.getElementById("confidence-average").textContent = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "—";
    document.getElementById("comparison-count").textContent = comparisonRecords().length;
    document.getElementById("domain-progress").innerHTML = categories.map((category) => {
      const inCategory = records.filter((item) => item.category === category);
      const done = inCategory.filter((item) => item.completed).length;
      const percent = inCategory.length ? Math.round(done / inCategory.length * 100) : 0;
      return `<article class="domain-card" data-category="${escapeHtml(category)}"><header><strong>${escapeHtml(category)}</strong><span>${done}/${inCategory.length}</span></header><div class="progress-track"><i style="width:${percent}%"></i></div></article>`;
    }).join("");
  }

  function renderComparisons() {
    const records = comparisonRecords();
    const list = document.getElementById("comparison-records");
    const noRecords = document.getElementById("comparison-empty");
    list.innerHTML = records.map((record) => `<article class="comparison-record-card">
      <div class="comparison-record-top"><span>${record.completedAt ? "✓ 已完成" : "進行中"}</span><small>${record.updatedAt || record.completedAt ? new Date(record.updatedAt || record.completedAt).toLocaleDateString("zh-TW") : "本機紀錄"}</small></div>
      <h3>${escapeHtml(record.left.title)} <i>×</i> ${escapeHtml(record.right.title)}</h3>
      <p class="comparison-record-question">${escapeHtml(record.question || `比較兩個模型的相同條件與關鍵差異。`)}</p>
      <dl><div><dt>保持相同</dt><dd>${escapeHtml(record.same || "尚未填寫")}</dd></div><div><dt>比較結論</dt><dd>${escapeHtml(record.conclusion || "尚未填寫")}</dd></div></dl>
      <a href="compare.html?left=${encodeURIComponent(record.left.file)}&right=${encodeURIComponent(record.right.file)}">繼續這組比較 →</a>
    </article>`).join("");
    list.hidden = records.length === 0;
    noRecords.hidden = records.length !== 0;
  }

  function render() {
    const records = visibleRecords();
    grid.innerHTML = records.map((item) => {
      const steps = [["predict","預測"],["observe","證據"],["explain","解釋"]];
      const notePreview = item.note.trim() || "尚未留下文字筆記。";
      return `<article class="record-card" data-category="${escapeHtml(item.category)}">
        <div class="record-topline"><span class="record-category">${escapeHtml(item.category)} · ${escapeHtml(item.format)}</span><span class="record-state${item.completed ? " complete" : ""}">${item.completed ? "已完成" : item.hasRecord ? "進行中" : "尚未開始"}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="record-progress">${steps.map(([key,label]) => `<span class="${item.progress[key] ? "done" : ""}">${item.progress[key] ? "✓ " : ""}${label}</span>`).join("")}</div>
        <div class="confidence-row"><span>理解信心：${confidenceLabels[item.confidence]}</span><span class="confidence-dots" aria-label="${item.confidence}／4">${[1,2,3,4].map((score) => `<i class="${score <= item.confidence ? "on" : ""}"></i>`).join("")}</span>${item.trials.length ? `<b class="trial-count">${item.trials.length} 次量測</b>` : ""}</div>
        <p class="note-preview">${escapeHtml(notePreview)}</p>
        <details><summary>查看變因、證據與量測</summary><div class="evidence-details"><p><strong>我改變：</strong>${escapeHtml(item.evidence.change || "尚未填寫")}</p><p><strong>我觀察到：</strong>${escapeHtml(item.evidence.observe || "尚未填寫")}</p><p><strong>我的解釋：</strong>${escapeHtml(item.evidence.explain || "尚未填寫")}</p>${item.trials.length ? `<div class="mini-trials"><span class="mini-trials-head"><b>#</b><i>${escapeHtml(item.measure.settingLabel)}</i><em>${escapeHtml(item.measure.resultLabel)}</em></span>${item.trials.map((trial,index) => `<span><b>${index + 1}</b><i>${escapeHtml(trial.setting || "—")}</i><em>${escapeHtml(trial.result || "—")}</em></span>`).join("")}</div>` : ""}</div></details>
        <div class="record-bottom"><a href="${encodeURI(item.file)}?role=student">${item.hasRecord ? "繼續探究" : "開始探究"} →</a>${item.hasRecord ? `<button type="button" data-export="${escapeHtml(item.file)}">匯出這一份</button>` : ""}</div>
      </article>`;
    }).join("");
    grid.hidden = records.length === 0;
    empty.hidden = records.length !== 0;
    summary.textContent = state.filter === "all" ? `顯示全部 ${records.length} 個實驗` : `找到 ${records.length} 份符合的探究紀錄`;
    renderSummary();
  }

  function markdownFor(item) {
    return [`# ${item.title}｜探究學習單`, "", `- 領域：${item.category}`, `- 理解信心：${confidenceLabels[item.confidence]}`, `- 狀態：${item.completed ? "已完成" : "進行中"}`, "", "## 探究任務", item.task, "", "## 關鍵提問", item.question, "", "## 我的預測與證據", item.note || "（尚未填寫）", "", "## 一次變因實驗", `- 我改變：${item.evidence.change || "（尚未填寫）"}`, `- 我觀察到：${item.evidence.observe || "（尚未填寫）"}`, `- 我的物理解釋：${item.evidence.explain || "（尚未填寫）"}`, "", "## 多次量測", `| 次數 | ${item.measure.settingLabel} | ${item.measure.resultLabel} |`, "| --- | --- | --- |", ...(item.trials.length ? item.trials.map((trial,index) => `| ${index + 1} | ${(trial.setting || "").replace(/\|/g,"\\|")} | ${(trial.result || "").replace(/\|/g,"\\|")} |`) : ["| — | 尚未記錄 | — |"]), ""].join("\n");
  }

  function comparisonMarkdown(record) {
    return [`# 雙模擬比較｜${record.left.title} × ${record.right.title}`, "", `- 狀態：${record.completedAt ? "已完成" : "進行中"}`, `- 核心問題：${record.question || "比較兩個模型的相同條件與關鍵差異。"}`, "", "## 公平比較", `- 我保持相同：${record.same || "（尚未填寫）"}`, `- 我刻意改變：${record.change || "（尚未填寫）"}`, "", "## 觀察結果", `- ${record.left.title}：${record["left-result"] || "（尚未填寫）"}`, `- ${record.right.title}：${record["right-result"] || "（尚未填寫）"}`, "", "## 比較結論", record.conclusion || "（尚未填寫）", ""].join("\n");
  }

  function download(name, content) {
    const blob = new Blob(["\uFEFF", content], { type:"text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name.replace(/[\\/:*?"<>|]/g,"-");
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export]");
    if (!button) return;
    const item = recordFor(activities.find((activity) => activity.file === button.dataset.export));
    download(`${item.title}-探究學習單.md`, markdownFor(item));
    showToast("這份學習單已匯出");
  });

  document.getElementById("export-notebook").addEventListener("click", () => {
    const records = allRecords().filter((item) => item.hasRecord);
    const comparisons = comparisonRecords();
    const content = [`# 我的物理探究紀錄`, "", `匯出時間：${new Date().toLocaleString("zh-TW")}`, "", ...comparisons.map(comparisonMarkdown), ...records.map(markdownFor)].join("\n---\n\n");
    download("我的物理探究紀錄.md", content);
    showToast(`已匯出 ${records.length} 份實驗與 ${comparisons.length} 份比較紀錄`);
  });
  document.getElementById("print-notebook").addEventListener("click", () => window.print());

  document.querySelector(".record-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    document.querySelectorAll(".record-filters button").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
    render();
  });
  document.getElementById("record-search").addEventListener("input", (event) => { state.query = event.target.value; render(); });

  const last = parse("physics-last-activity", null);
  if (last && activities.some((item) => item.file === last.file)) {
    document.getElementById("continue-card").hidden = false;
    document.getElementById("continue-title").textContent = last.title;
    document.getElementById("continue-link").href = `${encodeURI(last.file)}?role=student`;
  }

  function showToast(message) {
    const toast = document.getElementById("notebook-toast");
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
  }

  renderComparisons();
  render();
})();
