(function () {
  "use strict";

  const activities = window.PhysicsClassroom?.activities || [];
  const paths = window.PhysicsClassroom?.paths || [];
  const categories = window.PhysicsClassroom?.categories || ["全部"];
  const refs = {
    title: document.getElementById("lesson-title"),
    sequence: document.getElementById("lesson-sequence"),
    count: document.getElementById("plan-count"),
    frame: document.getElementById("simulation-frame"),
    frameEmpty: document.getElementById("frame-empty"),
    category: document.getElementById("current-category"),
    currentTitle: document.getElementById("current-title"),
    summary: document.getElementById("current-summary"),
    question: document.getElementById("current-question"),
    demo: document.getElementById("demo-flow"),
    dialog: document.getElementById("catalog-dialog"),
    paths: document.getElementById("lesson-paths"),
    catalog: document.getElementById("lesson-catalog"),
    categories: document.getElementById("lesson-categories"),
    search: document.getElementById("lesson-search"),
    selectionCount: document.getElementById("selection-count"),
    teachingPanel: document.getElementById("teaching-panel"),
    timer: document.getElementById("lesson-timer"),
    prompt: document.getElementById("lesson-prompt"),
    promptQuestion: document.getElementById("projected-question"),
    promptCategory: document.getElementById("prompt-category"),
    promptTimer: document.getElementById("prompt-timer"),
    toast: document.getElementById("studio-toast")
  };

  const storage = {
    get(key, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* private mode */ } }
  };

  function readPlan() {
    try {
      const raw = storage.get("physics-lesson-plan", "");
      if (raw) {
        const stored = JSON.parse(raw);
        return stored.filter((file) => activities.some((item) => item.file === file));
      }
    } catch (_) { /* use starter */ }
    return ["運動函數圖.html", "摩擦.html", "碰撞.html"].filter((file) => activities.some((item) => item.file === file));
  }

  const state = {
    plan: readPlan(),
    current: 0,
    phase: "predict",
    category: "全部",
    query: "",
    draft: new Set(),
    draftTitle: ""
  };
  let timerSeconds = 300;
  let timerInterval = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function getActivity(file) { return activities.find((item) => item.file === file); }
  function currentActivity() { return getActivity(state.plan[state.current]); }
  function savePlan() { storage.set("physics-lesson-plan", JSON.stringify(state.plan)); }

  function renderSequence() {
    refs.count.textContent = state.plan.length;
    refs.sequence.innerHTML = state.plan.map((file, index) => {
      const item = getActivity(file);
      return `<li class="sequence-item${index === state.current ? " active" : ""}" data-index="${index}">
        <span class="sequence-number">${String(index + 1).padStart(2, "0")}</span>
        <button class="sequence-select" type="button"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.format)}</small></button>
        <span class="sequence-controls">
          <button type="button" data-action="up" aria-label="向前移動" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-action="down" aria-label="向後移動" ${index === state.plan.length - 1 ? "disabled" : ""}>↓</button>
          <button class="remove-step" type="button" data-action="remove" aria-label="移除">移除</button>
        </span>
      </li>`;
    }).join("");
    renderCurrent();
  }

  function renderCurrent() {
    const item = currentActivity();
    refs.frame.hidden = !item;
    refs.frameEmpty.hidden = Boolean(item);
    if (!item) {
      refs.currentTitle.textContent = "選擇一個模擬";
      refs.category.textContent = "教學提示";
      refs.summary.textContent = "編排後即可在同一個畫面依序展示。";
      refs.question.textContent = "先預測，再操作。";
      refs.demo.innerHTML = "";
      return;
    }
    const target = `${encodeURI(item.file)}?role=teacher&embed=1`;
    if (!refs.frame.src.endsWith(target)) refs.frame.src = target;
    refs.frame.title = `${item.title}物理模擬`;
    refs.category.textContent = `${item.category} · ${item.format}`;
    refs.currentTitle.textContent = item.title;
    refs.summary.textContent = item.summary;
    refs.question.textContent = item.question;
    refs.demo.innerHTML = item.demo.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    refs.promptQuestion.textContent = item.question;
    refs.promptCategory.textContent = `${item.category} · ${item.title}`;
  }

  function moveStep(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= state.plan.length) return;
    [state.plan[index], state.plan[target]] = [state.plan[target], state.plan[index]];
    if (state.current === index) state.current = target;
    else if (state.current === target) state.current = index;
    savePlan();
    renderSequence();
  }

  refs.sequence.addEventListener("click", (event) => {
    const row = event.target.closest(".sequence-item");
    if (!row) return;
    const index = Number(row.dataset.index);
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "up") moveStep(index, -1);
    else if (action === "down") moveStep(index, 1);
    else if (action === "remove") {
      state.plan.splice(index, 1);
      state.current = Math.max(0, Math.min(state.current, state.plan.length - 1));
      savePlan();
      renderSequence();
    } else if (event.target.closest(".sequence-select")) {
      state.current = index;
      renderSequence();
    }
  });

  function openCatalog() {
    state.draft = new Set(state.plan);
    state.draftTitle = refs.title.value;
    renderCatalog();
    if (typeof refs.dialog.showModal === "function") refs.dialog.showModal();
    else refs.dialog.setAttribute("open", "");
    window.setTimeout(() => refs.search.focus(), 30);
  }

  function visibleCatalog() {
    const query = state.query.trim().toLocaleLowerCase("zh-TW");
    return activities.filter((item) => {
      const categoryMatch = state.category === "全部" || item.category === state.category;
      const queryMatch = !query || [item.title, item.category, item.summary, ...item.goal].join(" ").toLocaleLowerCase("zh-TW").includes(query);
      return categoryMatch && queryMatch;
    });
  }

  function renderCatalog() {
    const matchesPath = (path) => path.files.length === state.draft.size && path.files.every((file) => state.draft.has(file));
    refs.paths.innerHTML = paths.map((path) => `<button class="path-preset${matchesPath(path) ? " active" : ""}" type="button" data-path="${escapeHtml(path.id)}" aria-pressed="${matchesPath(path)}">
      <span>${escapeHtml(path.category)} · ${path.duration} 分鐘</span>
      <strong>${escapeHtml(path.title)}</strong>
      <small>${path.files.length} 個實驗</small>
    </button>`).join("");
    refs.categories.innerHTML = categories.map((category) => `<button class="${category === state.category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
    refs.catalog.innerHTML = visibleCatalog().map((item) => `<label class="catalog-option">
      <input type="checkbox" value="${escapeHtml(item.file)}" ${state.draft.has(item.file) ? "checked" : ""}>
      <small>${escapeHtml(item.category)} · ${escapeHtml(item.format)}</small>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.summary)}</span>
    </label>`).join("");
    refs.selectionCount.textContent = `已選 ${state.draft.size} 個`;
  }

  refs.catalog.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    if (event.target.checked) state.draft.add(event.target.value);
    else state.draft.delete(event.target.value);
    renderCatalog();
  });
  refs.paths.addEventListener("click", (event) => {
    const button = event.target.closest("[data-path]");
    if (!button) return;
    const path = paths.find((item) => item.id === button.dataset.path);
    if (!path) return;
    state.draft = new Set(path.files.filter((file) => activities.some((item) => item.file === file)));
    state.draftTitle = path.title;
    state.category = "全部";
    state.query = "";
    refs.search.value = "";
    renderCatalog();
    showToast(`已帶入「${path.title}」的 ${state.draft.size} 個實驗`);
  });
  refs.categories.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCatalog();
  });
  refs.search.addEventListener("input", () => { state.query = refs.search.value; renderCatalog(); });
  document.getElementById("save-plan").addEventListener("click", () => {
    state.plan = [...state.draft];
    if (state.draftTitle) {
      refs.title.value = state.draftTitle;
      storage.set("physics-lesson-title", refs.title.value);
    }
    state.current = Math.min(state.current, Math.max(0, state.plan.length - 1));
    savePlan();
    renderSequence();
    refs.dialog.close?.();
    showToast(`課堂流程已更新，共 ${state.plan.length} 個模擬`);
  });
  ["manage-plan", "add-step"].forEach((id) => document.getElementById(id).addEventListener("click", openCatalog));
  refs.frameEmpty.querySelector("button").addEventListener("click", openCatalog);

  const phaseCopy = {
    predict: "先請學生說出預測，再開始操作。",
    explore: "一次只改變一個變因，停下來讀取證據。",
    explain: "回到關鍵問題，用物理概念整理因果。"
  };
  document.querySelector(".phase-buttons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-phase]");
    if (!button) return;
    state.phase = button.dataset.phase;
    document.querySelectorAll(".phase-buttons button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("phase-copy").textContent = phaseCopy[state.phase];
  });

  refs.title.value = storage.get("physics-lesson-title", "物理探究課");
  refs.title.addEventListener("input", () => storage.set("physics-lesson-title", refs.title.value));
  document.getElementById("fullscreen-stage").addEventListener("click", () => {
    document.getElementById("simulation-stage").requestFullscreen?.().catch(() => showToast("此瀏覽器未允許全螢幕"));
  });
  document.getElementById("guide-toggle").addEventListener("click", () => refs.teachingPanel.classList.toggle("open"));
  document.getElementById("mobile-guide-close").addEventListener("click", () => refs.teachingPanel.classList.remove("open"));

  function formatTime(seconds) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`; }
  function updateTimer() {
    refs.timer.textContent = formatTime(timerSeconds);
    refs.promptTimer.textContent = formatTime(timerSeconds);
    if (timerSeconds <= 0) stopTimer("重新開始");
  }
  function stopTimer(label = "繼續") {
    window.clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById("timer-toggle").textContent = label;
    document.getElementById("prompt-timer-toggle").textContent = label;
  }
  function toggleTimer() {
    if (timerSeconds <= 0) timerSeconds = 300;
    if (timerInterval) stopTimer();
    else {
      document.getElementById("timer-toggle").textContent = "暫停";
      document.getElementById("prompt-timer-toggle").textContent = "暫停";
      timerInterval = window.setInterval(() => { timerSeconds -= 1; updateTimer(); }, 1000);
    }
    updateTimer();
  }
  document.getElementById("timer-toggle").addEventListener("click", toggleTimer);
  document.getElementById("prompt-timer-toggle").addEventListener("click", toggleTimer);
  document.getElementById("timer-minus").addEventListener("click", () => { timerSeconds = Math.max(60, timerSeconds - 60); updateTimer(); });
  document.getElementById("timer-plus").addEventListener("click", () => { timerSeconds += 60; updateTimer(); });
  document.getElementById("project-prompt").addEventListener("click", () => {
    if (!currentActivity()) return;
    refs.prompt.classList.add("open");
    refs.prompt.setAttribute("aria-hidden", "false");
    document.getElementById("close-prompt").focus();
  });
  document.getElementById("close-prompt").addEventListener("click", () => {
    refs.prompt.classList.remove("open");
    refs.prompt.setAttribute("aria-hidden", "true");
  });

  document.getElementById("export-plan").addEventListener("click", () => {
    const lines = [`# ${refs.title.value || "物理探究課"}`, "", `建立時間：${new Date().toLocaleString("zh-TW")}`, ""];
    state.plan.forEach((file, index) => {
      const item = getActivity(file);
      lines.push(`## ${index + 1}. ${item.title}`, "", `**探究任務：** ${item.task}`, "", `**關鍵提問：** ${item.question}`, "", "展示節奏：", ...item.demo.map((step, stepIndex) => `${stepIndex + 1}. ${step}`), "");
    });
    const blob = new Blob(["\uFEFF", lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(refs.title.value || "物理探究課").replace(/[\\/:*?"<>|]/g, "-")}-教案.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast("教案已匯出");
  });

  function showToast(message) {
    window.clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    toastTimer = window.setTimeout(() => refs.toast.classList.remove("show"), 2400);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      refs.prompt.classList.remove("open");
      refs.teachingPanel.classList.remove("open");
    }
    if (event.key === "ArrowRight" && event.altKey && state.current < state.plan.length - 1) { state.current += 1; renderSequence(); }
    if (event.key === "ArrowLeft" && event.altKey && state.current > 0) { state.current -= 1; renderSequence(); }
  });

  updateTimer();
  savePlan();
  renderSequence();
})();
