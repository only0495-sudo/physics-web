(function () {
  "use strict";

  const data = window.PhysicsClassroom;
  if (!data) return;

  const grid = document.getElementById("activity-grid");
  const filters = document.getElementById("category-filters");
  const search = document.getElementById("activity-search");
  const summary = document.getElementById("result-summary");
  const empty = document.getElementById("empty-state");
  const state = { category: "全部", query: "", role: readStorage("physics-role", "teacher") };

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

  function render() {
    const visible = visibleActivities();
    grid.innerHTML = visible.map((item) => `
      <article class="activity-card" data-category="${escapeHtml(item.category)}">
        <div class="card-topline"><span class="category-tag">${escapeHtml(item.category)}</span><span class="format-tag">${escapeHtml(item.format)}</span></div>
        <h3><a href="${encodeURI(item.file)}?role=${state.role}">${escapeHtml(item.title)}</a></h3>
        <p class="card-summary">${escapeHtml(item.summary)}</p>
        <div class="card-actions">
          <a class="card-link" href="${encodeURI(item.file)}?role=${state.role}" aria-label="模擬開始：${escapeHtml(item.title)}">模擬開始 <span aria-hidden="true">↗</span></a>
        </div>
      </article>`).join("");
    empty.hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    const scope = state.category === "全部" ? "全部領域" : state.category;
    summary.textContent = state.query ? `${scope}中找到 ${visible.length} 個相符實驗` : `${scope}共有 ${visible.length} 個互動實驗`;
    renderFilters();
  }

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
