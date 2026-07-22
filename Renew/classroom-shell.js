(function () {
  "use strict";

  if (document.documentElement.dataset.classroomHome === "true") return;

  const catalog = window.PhysicsClassroom?.activities || [];
  const storage = {
    get(key, fallback = "") {
      try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { /* private mode */ }
    },
    sessionGet(key, fallback = "") {
      try { return sessionStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
    },
    sessionSet(key, value) {
      try { sessionStorage.setItem(key, value); } catch (_) { /* private mode */ }
    }
  };

  function currentFilename() {
    const raw = location.pathname.split("/").pop() || "";
    try { return decodeURIComponent(raw); } catch (_) { return raw; }
  }

  const fallback = {
    file: currentFilename(),
    title: document.title.replace(/\s*\([^)]*v\d[^)]*\)\s*/gi, "").trim() || "物理互動模擬",
    category: "物理探究",
    summary: "操作變因、觀察現象，再用物理概念解釋你找到的規律。",
    goal: ["辨認模擬中的控制變因與應變變因", "以觀察證據支持物理推論"],
    task: "先預測改變一個控制量後會發生什麼，再實際操作並比較。",
    question: "你觀察到的變化，能用哪一條物理原理說明？",
    demo: ["先說明情境但不揭示答案", "一次改變一個變因", "用數據或圖像整理規律"],
    gesture: "一次只改一個控制量，操作後停下來讀取數值。"
  };
  const activity = catalog.find((item) => item.file === fallback.file) || fallback;
  document.documentElement.dataset.physicsPage = activity.file.replace(/\.html$/i, "");
  const embedded = new URLSearchParams(location.search).get("embed") === "1";
  const noteKey = `physics-note:${activity.file}`;
  const progressKey = `physics-progress:${activity.file}`;
  const confidenceKey = `physics-confidence:${activity.file}`;
  const evidenceKey = `physics-evidence:${activity.file}`;
  const trialsKey = `physics-trials:${activity.file}`;
  const completedKey = `physics-completed:${activity.file}`;
  let lastFocus = null;
  let toastTimer = null;

  function detectDevice() {
    const width = window.innerWidth;
    const shortest = Math.min(window.innerWidth, window.innerHeight);
    const coarse = window.matchMedia?.("(pointer: coarse)").matches || false;
    const ua = navigator.userAgent;
    const touchPoints = navigator.maxTouchPoints || 0;
    const ipad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && touchPoints > 1);
    const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    const uaMobile = navigator.userAgentData?.mobile || /iPhone|iPod|Android.+Mobile|Mobile/i.test(ua);
    let type = "desktop";
    if (uaMobile && !ipad && shortest <= 720) type = "phone";
    else if (ipad || androidTablet || (coarse && touchPoints > 1 && shortest <= 1100)) type = "tablet";

    document.documentElement.dataset.physicsDevice = type;
    document.documentElement.dataset.physicsOrientation = width >= window.innerHeight ? "landscape" : "portrait";
    return type;
  }

  function deviceCopy(type) {
    if (type === "phone") {
      return { label: "手機介面", symbol: "▯", tip: `${activity.gesture} 建議橫放手機以取得更大的模擬區。` };
    }
    if (type === "tablet") {
      return { label: "平板介面", symbol: "▭", tip: `${activity.gesture} 控制元件已放大，可直接觸控操作。` };
    }
    return { label: "電腦介面", symbol: "▰", tip: `${activity.gesture} 可用 Alt+G 開啟教學、Alt+P 切換展示。` };
  }

  function getRole() {
    const query = new URLSearchParams(location.search).get("role");
    if (query === "teacher" || query === "student") storage.set("physics-role", query);
    return query === "teacher" || query === "student" ? query : storage.get("physics-role", "student");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function list(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function buildShell() {
    const type = detectDevice();
    if (embedded) {
      document.documentElement.dataset.physicsEmbedded = "true";
      return;
    }
    const device = deviceCopy(type);
    const role = getRole();
    storage.set("physics-last-activity", JSON.stringify({ file: activity.file, title: activity.title, visitedAt: new Date().toISOString() }));
    const shell = document.createElement("div");
    shell.className = "pc-shell";
    shell.dataset.role = role;
    shell.innerHTML = `
      <nav class="pc-dock" aria-label="物理教學工具列">
        <div class="pc-brand" aria-label="裝置已辨識為${device.label}">
          <span class="pc-brand-mark" aria-hidden="true">φ</span>
          <span class="pc-brand-copy"><strong>物理探究</strong><span class="pc-device-label">${device.label}</span></span>
        </div>
        <a class="pc-dock-action" href="index.html" aria-label="回到實驗室首頁"><span class="pc-action-symbol" aria-hidden="true">⌂</span><span class="pc-dock-label">首頁</span></a>
        <button class="pc-dock-action pc-primary pc-guide-button" type="button" aria-controls="pc-guide" aria-expanded="false" title="教學指南（Alt+G）"><span class="pc-action-symbol" aria-hidden="true">?</span><span class="pc-dock-label">教學</span></button>
        <button class="pc-dock-action pc-present-button" type="button" aria-pressed="false" title="課堂展示（Alt+P）"><span class="pc-action-symbol" aria-hidden="true">◫</span><span class="pc-dock-label">展示</span></button>
        <button class="pc-dock-action pc-reset-button" type="button" title="重設模擬（Alt+R）"><span class="pc-action-symbol" aria-hidden="true">↻</span><span class="pc-dock-label">重設</span></button>
        <button class="pc-dock-action pc-dock-minimize" type="button" aria-label="收合教學工具列" aria-pressed="false"><span class="pc-action-symbol" aria-hidden="true">−</span></button>
      </nav>
      <div class="pc-drawer-backdrop" aria-hidden="true"></div>
      <aside class="pc-drawer" id="pc-guide" role="dialog" aria-modal="true" aria-labelledby="pc-guide-title" aria-hidden="true">
        <header class="pc-drawer-header">
          <p class="pc-drawer-eyebrow">${escapeHtml(activity.category)} · ${role === "teacher" ? "課堂展示指南" : "學生探究指南"}</p>
          <h2 class="pc-drawer-title" id="pc-guide-title">${escapeHtml(activity.title)}</h2>
          <button class="pc-drawer-close" type="button" aria-label="關閉教學指南">×</button>
        </header>
        <div class="pc-drawer-scroll">
          <div class="pc-role-strip"><span>目前模式：${role === "teacher" ? "老師展示" : "學生探索"}</span><button class="pc-role-toggle" type="button">切換成${role === "teacher" ? "學生" : "老師"}</button></div>
          <section class="pc-section pc-task-card" aria-labelledby="pc-task-heading">
            <span class="pc-task-label" id="pc-task-heading">先預測，再操作</span>
            <p>${escapeHtml(activity.task)}</p>
          </section>
          <section class="pc-section" aria-labelledby="pc-progress-heading">
            <h3 id="pc-progress-heading">探究進度</h3>
            <div class="pc-inquiry-steps">
              <button class="pc-step" type="button" data-step="predict" aria-pressed="false"><span class="pc-step-number">1</span>我已預測</button>
              <button class="pc-step" type="button" data-step="observe" aria-pressed="false"><span class="pc-step-number">2</span>我有證據</button>
              <button class="pc-step" type="button" data-step="explain" aria-pressed="false"><span class="pc-step-number">3</span>我能解釋</button>
            </div>
          </section>
          <section class="pc-section" aria-labelledby="pc-confidence-heading">
            <h3 id="pc-confidence-heading">我現在有多確定？</h3>
            <div class="pc-confidence" role="group" aria-label="理解信心評量">
              <button type="button" data-confidence="1" aria-pressed="false"><span>1</span>還不確定</button>
              <button type="button" data-confidence="2" aria-pressed="false"><span>2</span>有點懂了</button>
              <button type="button" data-confidence="3" aria-pressed="false"><span>3</span>能夠說明</button>
              <button type="button" data-confidence="4" aria-pressed="false"><span>4</span>能教別人</button>
            </div>
          </section>
          <section class="pc-section" aria-labelledby="pc-goal-heading">
            <h3 id="pc-goal-heading">這次要學會</h3>
            <ul>${list(activity.goal)}</ul>
          </section>
          <section class="pc-section" aria-labelledby="pc-question-heading">
            <h3 id="pc-question-heading">關鍵提問</h3>
            <p class="pc-question">${escapeHtml(activity.question)}</p>
          </section>
          <section class="pc-section pc-teacher-section" aria-labelledby="pc-demo-heading">
            <h3 id="pc-demo-heading">老師展示節奏</h3>
            <ol>${list(activity.demo)}</ol>
            <div class="pc-live-tools">
              <button class="pc-project-question" type="button"><span aria-hidden="true">◫</span> 投影關鍵提問</button>
              <button class="pc-annotation-start" type="button"><span aria-hidden="true">✎</span> 畫面註記</button>
            </div>
            <div class="pc-timer-presets" aria-label="討論計時">
              <span>討論計時</span>
              <button type="button" data-timer="180">3 分</button>
              <button type="button" data-timer="300">5 分</button>
              <button type="button" data-timer="600">10 分</button>
            </div>
          </section>
          <section class="pc-section" aria-labelledby="pc-note-heading">
            <h3 id="pc-note-heading">我的預測與證據</h3>
            <textarea class="pc-notes" rows="4" placeholder="寫下：我原本預測……；操作後我觀察到……" aria-label="探究筆記"></textarea>
            <span class="pc-save-status" role="status">筆記只儲存在這台裝置</span>
          </section>
          <section class="pc-section" aria-labelledby="pc-evidence-heading">
            <h3 id="pc-evidence-heading">整理一次變因實驗</h3>
            <div class="pc-evidence-grid">
              <label><span>我改變的變因／設定</span><input class="pc-evidence-change" type="text" placeholder="${escapeHtml(activity.measure.settingPlaceholder)}"></label>
              <label><span>我觀察到</span><textarea class="pc-evidence-observe" rows="2" placeholder="${escapeHtml(activity.measure.resultPlaceholder)}"></textarea></label>
              <label><span>我的物理解釋</span><textarea class="pc-evidence-explain" rows="2" placeholder="用公式或概念連結證據"></textarea></label>
            </div>
          </section>
          <section class="pc-section" aria-labelledby="pc-trials-heading">
            <h3 id="pc-trials-heading">多次量測表</h3>
            <p class="pc-trials-help">${escapeHtml(activity.measure.prompt)}</p>
            <div class="pc-trials-table" role="table" aria-label="多次實驗量測">
              <div class="pc-trials-head" role="row"><span role="columnheader">次數</span><span role="columnheader">${escapeHtml(activity.measure.settingLabel)}</span><span role="columnheader">${escapeHtml(activity.measure.resultLabel)}</span><span aria-hidden="true"></span></div>
              <div class="pc-trials-body"></div>
            </div>
            <div class="pc-trials-actions"><button class="pc-add-trial" type="button">＋ 新增一次</button><button class="pc-export-csv" type="button">匯出 CSV</button></div>
          </section>
          <section class="pc-section pc-device-tip" aria-label="裝置操作提示">
            <span class="pc-device-tip-symbol" aria-hidden="true">${device.symbol}</span>
            <span><strong>${device.label}操作提示</strong><span class="pc-device-tip-copy">${escapeHtml(device.tip)}</span></span>
          </section>
          <div class="pc-record-actions">
            <button class="pc-export-button" type="button">匯出本次學習單</button>
            <a class="pc-notebook-link" href="notebook.html">查看全部學習紀錄</a>
          </div>
          <button class="pc-complete-button" type="button">完成這次探究</button>
          <button class="pc-start-button" type="button">回到模擬繼續觀察</button>
        </div>
      </aside>
      <section class="pc-question-stage" role="dialog" aria-modal="true" aria-labelledby="pc-stage-question" aria-hidden="true">
        <div class="pc-stage-inner">
          <div class="pc-stage-topline"><span>${escapeHtml(activity.category)} · 全班討論</span><button class="pc-stage-close" type="button" aria-label="關閉投影提問">×</button></div>
          <p class="pc-stage-label">先不要操作，請做出預測</p>
          <h2 id="pc-stage-question">${escapeHtml(activity.question)}</h2>
          <p class="pc-stage-task">${escapeHtml(activity.task)}</p>
          <div class="pc-stage-timer" aria-live="polite">05:00</div>
          <div class="pc-stage-controls">
            <button class="pc-stage-toggle" type="button">開始計時</button>
            <button class="pc-stage-add" type="button">＋1 分鐘</button>
          </div>
        </div>
      </section>
      <canvas class="pc-annotation-canvas" aria-label="畫面註記圖層"></canvas>
      <div class="pc-annotation-tools" role="toolbar" aria-label="畫面註記工具">
        <strong>畫面註記</strong>
        <button type="button" data-ink="#ff4f45" aria-label="紅色畫筆" class="active"><span style="--ink:#ff4f45"></span></button>
        <button type="button" data-ink="#ffd34e" aria-label="黃色畫筆"><span style="--ink:#ffd34e"></span></button>
        <button type="button" data-ink="#43a5ff" aria-label="藍色畫筆"><span style="--ink:#43a5ff"></span></button>
        <button class="pc-annotation-clear" type="button">清除</button>
        <button class="pc-annotation-close" type="button">完成</button>
      </div>
      <div class="pc-toast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(shell);
    bindShell(shell);
  }

  function bindShell(shell) {
    const dock = shell.querySelector(".pc-dock");
    const drawer = shell.querySelector(".pc-drawer");
    const backdrop = shell.querySelector(".pc-drawer-backdrop");
    const guideButton = shell.querySelector(".pc-guide-button");
    const presentButton = shell.querySelector(".pc-present-button");
    const notes = shell.querySelector(".pc-notes");
    const saveStatus = shell.querySelector(".pc-save-status");
    const deviceLabel = shell.querySelector(".pc-device-label");
    const deviceTip = shell.querySelector(".pc-device-tip-copy");
    const evidenceInputs = [...shell.querySelectorAll(".pc-evidence-grid input, .pc-evidence-grid textarea")];
    const stage = shell.querySelector(".pc-question-stage");
    const stageTimer = shell.querySelector(".pc-stage-timer");
    const stageToggle = shell.querySelector(".pc-stage-toggle");
    const annotationCanvas = shell.querySelector(".pc-annotation-canvas");
    const annotationTools = shell.querySelector(".pc-annotation-tools");
    const trialsBody = shell.querySelector(".pc-trials-body");
    let noteTimer;
    let recordTimer;
    let countdown = 300;
    let countdownTimer = null;
    let drawing = false;
    let ink = "#ff4f45";
    let runtimeErrorShown = false;
    let trials = [];
    try { trials = JSON.parse(storage.get(trialsKey, "[]")); } catch (_) { trials = []; }
    if (!Array.isArray(trials) || !trials.length) trials = [{ setting: "", result: "" }, { setting: "", result: "" }, { setting: "", result: "" }];

    function openDrawer() {
      lastFocus = document.activeElement;
      drawer.classList.add("pc-open");
      backdrop.classList.add("pc-open");
      drawer.setAttribute("aria-hidden", "false");
      guideButton.setAttribute("aria-expanded", "true");
      window.setTimeout(() => drawer.querySelector(".pc-drawer-close")?.focus(), 20);
    }

    function closeDrawer() {
      drawer.classList.remove("pc-open");
      backdrop.classList.remove("pc-open");
      drawer.setAttribute("aria-hidden", "true");
      guideButton.setAttribute("aria-expanded", "false");
      if (lastFocus instanceof HTMLElement) lastFocus.focus();
    }

    function togglePresentation() {
      const active = !document.documentElement.classList.contains("pc-presentation-mode");
      document.documentElement.classList.toggle("pc-presentation-mode", active);
      presentButton.setAttribute("aria-pressed", String(active));
      if (active && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if (!active && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      showToast(active ? "已開啟課堂展示模式" : "已離開課堂展示模式");
    }

    guideButton.addEventListener("click", openDrawer);
    shell.querySelector(".pc-drawer-close").addEventListener("click", closeDrawer);
    shell.querySelector(".pc-start-button").addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    presentButton.addEventListener("click", togglePresentation);
    shell.querySelector(".pc-reset-button").addEventListener("click", () => location.reload());
    shell.querySelector(".pc-dock-minimize").addEventListener("click", (event) => {
      const compact = dock.classList.toggle("pc-compact");
      event.currentTarget.setAttribute("aria-pressed", String(compact));
      event.currentTarget.setAttribute("aria-label", compact ? "展開教學工具列" : "收合教學工具列");
      event.currentTarget.querySelector(".pc-action-symbol").textContent = compact ? "φ" : "−";
    });

    shell.querySelector(".pc-role-toggle").addEventListener("click", () => {
      const next = getRole() === "teacher" ? "student" : "teacher";
      storage.set("physics-role", next);
      const url = new URL(location.href);
      url.searchParams.set("role", next);
      location.assign(url.href);
    });

    const confidence = storage.get(confidenceKey, "");
    shell.querySelectorAll(".pc-confidence button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.confidence === confidence));
      button.addEventListener("click", () => {
        storage.set(confidenceKey, button.dataset.confidence);
        shell.querySelectorAll(".pc-confidence button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        showToast(`已記錄理解信心：${button.textContent.trim()}`);
      });
    });

    let progress;
    try { progress = JSON.parse(storage.get(progressKey, "{}")); } catch (_) { progress = {}; }
    shell.querySelectorAll(".pc-step").forEach((button) => {
      const step = button.dataset.step;
      button.setAttribute("aria-pressed", String(Boolean(progress[step])));
      button.addEventListener("click", () => {
        progress[step] = !progress[step];
        button.setAttribute("aria-pressed", String(progress[step]));
        storage.set(progressKey, JSON.stringify(progress));
        if (Object.values(progress).filter(Boolean).length === 3) showToast("完成一次完整探究：預測、證據、解釋");
      });
    });

    notes.value = storage.get(noteKey, "");
    notes.addEventListener("input", () => {
      saveStatus.textContent = "儲存中…";
      window.clearTimeout(noteTimer);
      noteTimer = window.setTimeout(() => {
        storage.set(noteKey, notes.value);
        saveStatus.textContent = "已儲存在這台裝置";
      }, 350);
    });

    let evidence = {};
    try { evidence = JSON.parse(storage.get(evidenceKey, "{}")); } catch (_) { evidence = {}; }
    const evidenceNames = ["change", "observe", "explain"];
    evidenceInputs.forEach((input, index) => {
      input.value = evidence[evidenceNames[index]] || "";
      input.addEventListener("input", () => {
        window.clearTimeout(recordTimer);
        recordTimer = window.setTimeout(() => {
          evidenceInputs.forEach((field, fieldIndex) => { evidence[evidenceNames[fieldIndex]] = field.value; });
          storage.set(evidenceKey, JSON.stringify(evidence));
          saveStatus.textContent = "探究紀錄已儲存在這台裝置";
        }, 300);
      });
    });

    const completeButton = shell.querySelector(".pc-complete-button");
    if (storage.get(completedKey)) completeButton.classList.add("is-complete"), completeButton.textContent = "✓ 已完成這次探究";
    completeButton.addEventListener("click", () => {
      storage.set(completedKey, new Date().toISOString());
      const allDone = { predict: true, observe: true, explain: true };
      Object.assign(progress, allDone);
      storage.set(progressKey, JSON.stringify(allDone));
      shell.querySelectorAll(".pc-step").forEach((button) => button.setAttribute("aria-pressed", "true"));
      completeButton.classList.add("is-complete");
      completeButton.textContent = "✓ 已完成這次探究";
      showToast("探究完成，學習紀錄已更新");
    });

    shell.querySelector(".pc-export-button").addEventListener("click", () => {
      evidenceInputs.forEach((field, fieldIndex) => { evidence[evidenceNames[fieldIndex]] = field.value; });
      storage.set(evidenceKey, JSON.stringify(evidence));
      storage.set(noteKey, notes.value);
      exportWorksheet(notes.value, evidence);
    });

    function saveTrials() {
      storage.set(trialsKey, JSON.stringify(trials));
      saveStatus.textContent = "量測資料已儲存在這台裝置";
    }

    function renderTrials() {
      trialsBody.innerHTML = trials.map((trial, index) => `<div class="pc-trial-row" role="row" data-index="${index}">
        <span class="pc-trial-number" role="cell">${index + 1}</span>
        <label role="cell"><span class="pc-mobile-column">${escapeHtml(activity.measure.settingLabel)}</span><input type="text" data-field="setting" value="${escapeHtml(trial.setting || "")}" placeholder="${escapeHtml(activity.measure.settingPlaceholder)}" aria-label="第 ${index + 1} 次：${escapeHtml(activity.measure.settingLabel)}"></label>
        <label role="cell"><span class="pc-mobile-column">${escapeHtml(activity.measure.resultLabel)}</span><input type="text" data-field="result" value="${escapeHtml(trial.result || "")}" placeholder="${escapeHtml(activity.measure.resultPlaceholder)}" aria-label="第 ${index + 1} 次：${escapeHtml(activity.measure.resultLabel)}"></label>
        <button class="pc-remove-trial" type="button" aria-label="刪除第 ${index + 1} 次量測" ${trials.length <= 1 ? "disabled" : ""}>×</button>
      </div>`).join("");
    }

    trialsBody.addEventListener("input", (event) => {
      const row = event.target.closest(".pc-trial-row");
      if (!row || !event.target.dataset.field) return;
      trials[Number(row.dataset.index)][event.target.dataset.field] = event.target.value;
      window.clearTimeout(recordTimer);
      recordTimer = window.setTimeout(saveTrials, 260);
    });
    trialsBody.addEventListener("click", (event) => {
      const button = event.target.closest(".pc-remove-trial");
      if (!button || button.disabled) return;
      trials.splice(Number(button.closest(".pc-trial-row").dataset.index), 1);
      saveTrials();
      renderTrials();
    });
    shell.querySelector(".pc-add-trial").addEventListener("click", () => {
      if (trials.length >= 10) return showToast("每份量測表最多 10 次");
      trials.push({ setting: "", result: "" });
      saveTrials();
      renderTrials();
      trialsBody.querySelector(".pc-trial-row:last-child input")?.focus();
    });
    shell.querySelector(".pc-export-csv").addEventListener("click", () => exportTrialsCsv(trials));
    renderTrials();

    function formatTime(total) {
      const safe = Math.max(0, total);
      return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
    }

    function updateCountdown() {
      stageTimer.textContent = formatTime(countdown);
      stageTimer.classList.toggle("is-finished", countdown <= 0);
      if (countdown <= 0) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        stageToggle.textContent = "重新開始";
      }
    }

    function openStage(seconds = countdown) {
      countdown = seconds;
      updateCountdown();
      stage.classList.add("pc-open");
      stage.setAttribute("aria-hidden", "false");
      closeDrawer();
      stage.querySelector(".pc-stage-close").focus();
    }

    function closeStage() {
      stage.classList.remove("pc-open");
      stage.setAttribute("aria-hidden", "true");
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      stageToggle.textContent = "開始計時";
    }

    function toggleCountdown() {
      if (countdown <= 0) countdown = 300;
      if (countdownTimer) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        stageToggle.textContent = "繼續計時";
      } else {
        stageToggle.textContent = "暫停計時";
        countdownTimer = window.setInterval(() => { countdown -= 1; updateCountdown(); }, 1000);
      }
      updateCountdown();
    }

    shell.querySelector(".pc-project-question").addEventListener("click", () => openStage(300));
    shell.querySelectorAll(".pc-timer-presets button").forEach((button) => button.addEventListener("click", () => { openStage(Number(button.dataset.timer)); toggleCountdown(); }));
    stage.querySelector(".pc-stage-close").addEventListener("click", closeStage);
    stageToggle.addEventListener("click", toggleCountdown);
    stage.querySelector(".pc-stage-add").addEventListener("click", () => { countdown += 60; updateCountdown(); });

    function sizeAnnotationCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      annotationCanvas.width = Math.round(window.innerWidth * ratio);
      annotationCanvas.height = Math.round(window.innerHeight * ratio);
      annotationCanvas.style.width = `${window.innerWidth}px`;
      annotationCanvas.style.height = `${window.innerHeight}px`;
      const context = annotationCanvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
    }

    function startAnnotation() {
      sizeAnnotationCanvas();
      annotationCanvas.classList.add("pc-open");
      annotationTools.classList.add("pc-open");
      closeDrawer();
    }

    function stopAnnotation() {
      annotationCanvas.classList.remove("pc-open");
      annotationTools.classList.remove("pc-open");
    }

    annotationCanvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      annotationCanvas.setPointerCapture(event.pointerId);
      const context = annotationCanvas.getContext("2d");
      context.beginPath();
      context.moveTo(event.clientX, event.clientY);
    });
    annotationCanvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const context = annotationCanvas.getContext("2d");
      context.strokeStyle = ink;
      context.lineWidth = detectDevice() === "desktop" ? 4 : 6;
      context.lineTo(event.clientX, event.clientY);
      context.stroke();
    });
    annotationCanvas.addEventListener("pointerup", () => { drawing = false; });
    annotationCanvas.addEventListener("pointercancel", () => { drawing = false; });
    shell.querySelector(".pc-annotation-start").addEventListener("click", startAnnotation);
    shell.querySelector(".pc-annotation-close").addEventListener("click", stopAnnotation);
    shell.querySelector(".pc-annotation-clear").addEventListener("click", () => annotationCanvas.getContext("2d").clearRect(0, 0, annotationCanvas.width, annotationCanvas.height));
    shell.querySelectorAll(".pc-annotation-tools [data-ink]").forEach((button) => button.addEventListener("click", () => {
      ink = button.dataset.ink;
      shell.querySelectorAll(".pc-annotation-tools [data-ink]").forEach((item) => item.classList.toggle("active", item === button));
    }));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("pc-open")) closeDrawer();
      if (event.key === "Escape" && stage.classList.contains("pc-open")) closeStage();
      if (event.key === "Escape" && annotationCanvas.classList.contains("pc-open")) stopAnnotation();
      if (!event.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
      const key = event.key.toLowerCase();
      if (key === "g") { event.preventDefault(); openDrawer(); }
      if (key === "p") { event.preventDefault(); togglePresentation(); }
      if (key === "r") { event.preventDefault(); location.reload(); }
    });

    drawer.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = [...drawer.querySelectorAll('button, textarea, a[href], input, select')].filter((node) => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && document.documentElement.classList.contains("pc-presentation-mode")) {
        document.documentElement.classList.remove("pc-presentation-mode");
        presentButton.setAttribute("aria-pressed", "false");
      }
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const device = deviceCopy(detectDevice());
        deviceLabel.textContent = device.label;
        deviceTip.textContent = device.tip;
      }, 140);
    }, { passive: true });

    window.addEventListener("offline", () => showToast("目前離線；部分 3D 或圖表實驗可能無法載入"));
    window.addEventListener("online", () => showToast("網路已恢復"));
    window.addEventListener("error", (event) => {
      if (runtimeErrorShown || event.target instanceof HTMLImageElement) return;
      runtimeErrorShown = true;
      showToast("模擬遇到載入問題，可先按「重設」再試一次");
    }, true);
    window.addEventListener("unhandledrejection", () => {
      if (runtimeErrorShown) return;
      runtimeErrorShown = true;
      showToast("模擬遇到執行問題，可先按「重設」再試一次");
    });

    if (!storage.sessionGet(`physics-welcome:${activity.file}`)) {
      storage.sessionSet(`physics-welcome:${activity.file}`, "1");
      window.setTimeout(() => showToast(`已切換為${deviceCopy(detectDevice()).label}・從「教學」開始探究`), 650);
    }
    if (!navigator.onLine) window.setTimeout(() => showToast("目前離線；部分 3D 或圖表實驗需要網路"), 1100);
  }

  function exportWorksheet(note, evidence) {
    let progress = {};
    try { progress = JSON.parse(storage.get(progressKey, "{}")); } catch (_) { progress = {}; }
    let trials = [];
    try { trials = JSON.parse(storage.get(trialsKey, "[]")); } catch (_) { trials = []; }
    const confidenceLabels = ["未評量", "還不確定", "有點懂了", "能夠說明", "能教別人"];
    const confidence = Number(storage.get(confidenceKey, "0"));
    const markdown = [
      `# ${activity.title}｜探究學習單`,
      "",
      `- 日期：${new Date().toLocaleString("zh-TW")}`,
      `- 領域：${activity.category}`,
      `- 理解信心：${confidenceLabels[confidence] || confidenceLabels[0]}`,
      `- 探究進度：預測 ${progress.predict ? "✓" : "□"}　證據 ${progress.observe ? "✓" : "□"}　解釋 ${progress.explain ? "✓" : "□"}`,
      "",
      "## 探究任務",
      activity.task,
      "",
      "## 關鍵提問",
      activity.question,
      "",
      "## 我的預測與證據",
      note || "（尚未填寫）",
      "",
      "## 一次變因實驗",
      `- 我改變：${evidence.change || "（尚未填寫）"}`,
      `- 我觀察到：${evidence.observe || "（尚未填寫）"}`,
      `- 我的物理解釋：${evidence.explain || "（尚未填寫）"}`,
      "",
      "## 多次量測",
      `| 次數 | ${activity.measure.settingLabel} | ${activity.measure.resultLabel} |`,
      "| --- | --- | --- |",
      ...(trials.length ? trials.map((trial, index) => `| ${index + 1} | ${(trial.setting || "").replace(/\|/g, "\\|")} | ${(trial.result || "").replace(/\|/g, "\\|")} |`) : ["| — | 尚未記錄 | — |"]),
      ""
    ].join("\n");
    const blob = new Blob(["\uFEFF", markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activity.title.replace(/[\\/:*?"<>|]/g, "-")}-探究學習單.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast("學習單已匯出");
  }

  function exportTrialsCsv(trials) {
    const quote = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
    const rows = [["實驗", activity.title], ["次數", activity.measure.settingLabel, activity.measure.resultLabel], ...trials.map((trial, index) => [index + 1, trial.setting, trial.result])];
    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activity.title.replace(/[\\/:*?"<>|]/g, "-")}-量測資料.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast("量測資料已匯出 CSV");
  }

  function showToast(message) {
    const toast = document.querySelector(".pc-toast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("pc-show");
    toastTimer = window.setTimeout(() => toast.classList.remove("pc-show"), 2600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildShell, { once: true });
  else buildShell();
})();
