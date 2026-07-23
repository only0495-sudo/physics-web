(function () {
  "use strict";

  const root = document.documentElement;
  const viewport = document.querySelector('meta[name="viewport"]');
  const landscapeQuery = window.matchMedia("(orientation: landscape)");
  const PHONE_LAYOUT_WIDTH = 1320;
  const TABLET_LAYOUT_WIDTH = 1180;

  function screenMetrics() {
    const screenWidth = Number(window.screen?.width) || window.innerWidth || 0;
    const screenHeight = Number(window.screen?.height) || window.innerHeight || 0;
    return {
      shortSide: Math.min(screenWidth, screenHeight),
      longSide: Math.max(screenWidth, screenHeight)
    };
  }

  function classifyDevice() {
    const { shortSide } = screenMetrics();
    const coarse = window.matchMedia?.("(pointer: coarse)").matches || false;
    const touchPoints = navigator.maxTouchPoints || 0;
    const ua = navigator.userAgent || "";
    const ipad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && touchPoints > 1);
    const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    const uaMobile = navigator.userAgentData?.mobile || /iPhone|iPod|Android.+Mobile|Mobile/i.test(ua);

    if (uaMobile && !ipad && shortSide <= 720) return "phone";
    if (ipad || androidTablet || (coarse && touchPoints > 1 && shortSide <= 1100)) return "tablet";
    return "desktop";
  }

  function applyLayout() {
    const type = classifyDevice();
    const orientation = landscapeQuery.matches ? "landscape" : "portrait";
    const { longSide } = screenMetrics();
    let designWidth = 0;

    if (orientation === "landscape" && type === "phone") designWidth = PHONE_LAYOUT_WIDTH;
    if (orientation === "landscape" && type === "tablet" && longSide < TABLET_LAYOUT_WIDTH) {
      designWidth = TABLET_LAYOUT_WIDTH;
    }

    if (viewport) {
      const content = designWidth
        ? `width=${designWidth}, viewport-fit=cover, user-scalable=yes`
        : "width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes";
      if (viewport.getAttribute("content") !== content) viewport.setAttribute("content", content);
    }

    const fitted = designWidth > 0;
    const physicalScale = fitted ? Math.min(1, longSide / designWidth) : 1;
    const pixelRatioCap = type === "phone" ? 1 : (type === "tablet" ? 1.5 : 2);
    const renderPixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
    root.dataset.physicsDevice = type;
    root.dataset.physicsOrientation = orientation;
    root.dataset.physicsLayout = fitted ? "fitted" : "native";
    root.dataset.physicsLayoutWidth = fitted ? String(designWidth) : "device";
    root.style.setProperty("--pc-layout-width", fitted ? `${designWidth}px` : "100vw");
    root.style.setProperty("--pc-physical-scale", physicalScale.toFixed(4));

    api.profile = { type, orientation, fitted, designWidth, physicalScale, renderPixelRatio };
    window.dispatchEvent(new CustomEvent("physicsdevicechange", { detail: api.profile }));
    return api.profile;
  }

  const api = {
    profile: null,
    refresh: applyLayout,
    classify: classifyDevice,
    phoneLayoutWidth: PHONE_LAYOUT_WIDTH,
    tabletLayoutWidth: TABLET_LAYOUT_WIDTH
  };

  window.PhysicsDeviceLayout = api;
  applyLayout();

  const handleOrientationChange = () => window.setTimeout(applyLayout, 120);
  if (landscapeQuery.addEventListener) landscapeQuery.addEventListener("change", handleOrientationChange);
  else landscapeQuery.addListener(handleOrientationChange);
  window.addEventListener("orientationchange", handleOrientationChange, { passive: true });
})();
