(function () {
  "use strict";

  const data = window.PhysicsClassroom;
  if (!data) return;

  const grid = document.getElementById("activity-grid");
  const filters = document.getElementById("category-filters");
  const search = document.getElementById("activity-search");
  const summary = document.getElementById("result-summary");
  const empty = document.getElementById("empty-state");
  const pathGrid = document.getElementById("pathway-grid");
  const state = { category: "全部", query: "", role: readStorage("physics-role", "student") };

  function readPlan() {
    try { return new Set(JSON.parse(readStorage("physics-lesson-plan", "[]"))); } catch (_) { return new Set(); }
  }

  function savePlan(plan) {
    writeStorage("physics-lesson-plan", JSON.stringify([...plan]));
    document.getElementById("studio-plan-count").textContent = plan.size;
  }

  function readStorage(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* private mode */ }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

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
    const copy = {
      phone: ["手機介面已就緒", "單欄卡片、放大觸控與底部教學工具", "▯"],
      tablet: ["平板介面已就緒", "雙欄瀏覽、放大觸控與橫向展示", "▭"],
      desktop: ["電腦介面已就緒", "寬螢幕實驗與鍵盤快速操作", "▰"]
    }[type];
    document.getElementById("device-label").textContent = copy[0];
    document.getElementById("device-hint").textContent = copy[1];
    document.querySelector(".device-symbol").textContent = copy[2];
  }

  function setRole(role) {
    state.role = role;
    writeStorage("physics-role", role);
    document.querySelectorAll(".role-button").forEach((button) => {
      const active = button.dataset.role === role;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("studio-link").hidden = role !== "teacher";
    render();
  }

  function renderFilters() {
    const counts = Object.fromEntries(data.categories.map((category) => [
      category,
      category === "全部" ? data.activities.length : data.activities.filter((item) => item.category === category).length
    ]));
    filters.innerHTML = data.categories.map((category) => `
      <button class="filter-button${category === state.category ? " active" : ""}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === state.category}">
        ${escapeHtml(category)}<span>${counts[category]}</span>
      </button>`).join("");
  }

  function visibleActivities() {
    const query = state.query.trim().toLocaleLowerCase("zh-TW");
    return data.activities.filter((item) => {
      const categoryMatch = state.category === "全部" || item.category === state.category;
      if (!categoryMatch) return false;
      if (!query) return true;
      return [item.title, item.category, item.format, item.summary, ...item.goal].join(" ").toLocaleLowerCase("zh-TW").includes(query);
    });
  }

  function renderPaths() {
    const paths = data.paths || [];
    document.getElementById("path-role-hint").textContent = state.role === "teacher" ? "老師模式：一鍵載入展示台" : "學生模式：從第一站開始";
    pathGrid.innerHTML = paths.map((path, index) => {
      const stations = path.files.map((file) => data.activities.find((item) => item.file === file)).filter(Boolean);
      const first = stations[0];
      return `<article class="pathway-card" data-category="${escapeHtml(path.category)}">
        <div class="pathway-top"><span>${String(index + 1).padStart(2, "0")}</span><b>${escapeHtml(path.category)}</b><em>${path.duration} 分鐘</em></div>
        <h3>${escapeHtml(path.title)}</h3>
        <p>${escapeHtml(path.summary)}</p>
        <ol>${stations.map((station) => `<li>${escapeHtml(station.title)}</li>`).join("")}</ol>
        <div class="pathway-question"><span>主問題</span>${escapeHtml(path.question)}</div>
        ${state.role === "teacher"
          ? `<button class="load-path" type="button" data-path="${escapeHtml(path.id)}">載入展示台 →</button>`
          : `<a class="start-path" href="${encodeURI(first?.file || "index.html")}?role=student">從第一站開始 →</a>`}
      </article>`;
    }).join("");
  }

  function render() {
    const visible = visibleActivities();
    const plan = readPlan();
    const roleText = state.role === "teacher" ? "開啟課堂展示" : "開始學生探究";
    grid.innerHTML = visible.map((item) => `
      <article class="activity-card" data-category="${escapeHtml(item.category)}">
        <div class="card-topline"><span class="category-tag">${escapeHtml(item.category)}</span><span class="format-tag">${escapeHtml(item.format)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="card-summary">${escapeHtml(item.summary)}</p>
        <p class="card-focus">${escapeHtml(item.goal[0])}</p>
        <div class="card-actions">
          <a class="card-link" href="${encodeURI(item.file)}?role=${state.role}" aria-label="${roleText}：${escapeHtml(item.title)}">${roleText}</a>
          ${state.role === "teacher" ? `<button class="lesson-add${plan.has(item.file) ? " added" : ""}" type="button" data-file="${escapeHtml(item.file)}" aria-pressed="${plan.has(item.file)}">${plan.has(item.file) ? "✓ 已加入課堂" : "＋ 加入課堂流程"}</button>` : ""}
        </div>
      </article>`).join("");
    empty.hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    const scope = state.category === "全部" ? "全部領域" : state.category;
    summary.textContent = state.query ? `${scope}中找到 ${visible.length} 個相符實驗` : `${scope}共有 ${visible.length} 個互動實驗`;
    renderFilters();
    renderPaths();
    document.getElementById("studio-plan-count").textContent = plan.size;
  }

  pathGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".load-path");
    if (!button) return;
    const path = data.paths.find((item) => item.id === button.dataset.path);
    if (!path) return;
    writeStorage("physics-lesson-plan", JSON.stringify(path.files));
    writeStorage("physics-lesson-title", path.title);
    location.assign("lesson.html");
  });

  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".lesson-add");
    if (!button) return;
    const plan = readPlan();
    if (plan.has(button.dataset.file)) plan.delete(button.dataset.file);
    else plan.add(button.dataset.file);
    savePlan(plan);
    render();
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-button");
    if (!button) return;
    state.category = button.dataset.category;
    render();
  });

  search.addEventListener("input", () => {
    state.query = search.value;
    render();
  });

  document.getElementById("clear-search").addEventListener("click", () => {
    search.value = "";
    state.query = "";
    state.category = "全部";
    render();
    search.focus();
  });

  document.querySelectorAll(".role-button").forEach((button) => {
    button.addEventListener("click", () => setRole(button.dataset.role));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      search.focus();
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(detectDevice, 150);
  }, { passive: true });

  detectDevice();
  setRole(state.role === "teacher" ? "teacher" : "student");
})();
