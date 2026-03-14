
// public/monitoring.js
(function () {
  if (window.MonitoringApp) return;

  let started = false;
  let map = null;
  let regionLayer = null;
  let carBridgeHandler = null;

  // ===== Helpers =====
  const fmtTime = (d = new Date()) =>
    d.toLocaleString("uz-UZ", { hour12: false });

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => min + Math.random() * (max - min);

  const BIN_PLACEHOLDER = "/bin-placeholder.jpg";

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (ch) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[ch] || ch;
    });
  }

  function dist2(a, b) {
    const dx = a.lat - b.lat;
    const dy = a.lng - b.lng;
    return dx * dx + dy * dy;
  }

  function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0],
        yi = ring[i][1];
      const xj = ring[j][0],
        yj = ring[j][1];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInMultiPolygon(lng, lat, multiPoly) {
    for (const polygon of multiPoly) {
      const outer = polygon[0];
      if (pointInRing(lng, lat, outer)) return true;
    }
    return false;
  }

  function bboxOfMultiPolygon(multiPoly) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const polygon of multiPoly) {
      for (const ring of polygon) {
        for (const c of ring) {
          const x = c[0],
            y = c[1];
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    return { minX, minY, maxX, maxY };
  }

  function normalizeImageUrl(url) {
    if (!url) return "";

    const s = String(url).trim();
    if (!s) return "";

    if (/^data:image\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return s;

    return `/${s}`;
  }

  function normalizeImageBase64(base64) {
    if (!base64) return "";

    const s = String(base64).trim();
    if (!s) return "";

    if (/^data:image\//i.test(s)) return s;

    // content-type kelmagan bo‘lsa default jpeg deb olamiz
    return `data:image/jpeg;base64,${s}`;
  }

  function buildBinImages(raw) {
    const images = [];

    if (raw?.imageUrl) {
      images.push(normalizeImageUrl(raw.imageUrl));
    }

    if (raw?.imageBase64) {
      images.push(normalizeImageBase64(raw.imageBase64));
    }

    // fallback: imageUrl/imageBase64 bo'lmasa id orqali image endpoint
    if (!images.length && raw?.id != null) {
      images.push(`/api/trashbins/${raw.id}/image`);
    }

    return [...new Set(images.filter(Boolean))];
  }

  function isAuthExpiredResponse(res, payload) {
    if (res?.headers?.get?.("x-monitor-auth") === "expired") return true;
    return payload?.authExpired === true;
  }

  function getStoredAuthToken() {
    try {
      return localStorage.getItem("monitor_token") || "";
    } catch (_) {
      return "";
    }
  }

  async function authFetch(input, init = {}) {
    const token = getStoredAuthToken();
    const headers = new Headers(init.headers || undefined);

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }

  async function redirectToLoginBecauseTokenExpired() {
    try {
      sessionStorage.setItem(
        "login_toast",
        JSON.stringify({
          title: "Sessiya tugadi",
          desc: "Token eskirdi. Qayta login qiling.",
        })
      );
    } catch (_) {}

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {}

    try {
      sessionStorage.removeItem("monitor_session");
      localStorage.removeItem("monitor_session_persist");
      localStorage.removeItem("monitor_token");
    } catch (_) {}

    window.location.replace("/login?expired=1");
  }

  function emitMonitoringReady() {
    try {
      window.dispatchEvent(
        new CustomEvent("monitoring:ready", {
          detail: {
            bins: Array.isArray(bins) ? bins.length : 0,
          },
        })
      );
    } catch (_) {}
  }

  // ===== UI refs =====
  let itemsEl, searchEl, kpiTotal, kpiRed, updatedAt;

  // bin modal refs
  let modalBack,
    mClose,
    mFocus,
    mTitle,
    mStatus,
    mFill,
    mCoord,
    mUpd,
    cleanBtn;
  let mMainImg, mThumbs, mBadgeStatus, mBadgeFill;

  // stats refs
  let statsBack, statsClose, sTotal, sRed, sGreen;

  // ===== Data state =====
  let regionMultiPoly = null;
  let regionBBox = null;

  let bins = [];
  let binMarkers = new Map();
  let selectedId = null;
  let markerFilter = "all";

  // focused bin state
  let activeFocusMarker = null;
  let activeFocusPopup = null;
  let activeFocusTimer = null;

  // icons
  let greenIcon, redIcon;

  function safeRemoveLayer(layer) {
    try {
      if (layer && map && map.hasLayer(layer)) map.removeLayer(layer);
    } catch (_) {}
  }

  function clearFocusedBin() {
    try {
      if (activeFocusTimer) {
        clearTimeout(activeFocusTimer);
        activeFocusTimer = null;
      }
    } catch (_) {}

    try {
      if (activeFocusMarker && map && map.hasLayer(activeFocusMarker)) {
        map.removeLayer(activeFocusMarker);
      }
    } catch (_) {}
    activeFocusMarker = null;

    try {
      if (activeFocusPopup && map) {
        map.closePopup(activeFocusPopup);
      }
    } catch (_) {}
    activeFocusPopup = null;
  }

  function removeAllBinMarkers() {
    clearFocusedBin();

    try {
      for (const m of binMarkers.values()) safeRemoveLayer(m);
    } catch (_) {}

    binMarkers.clear();
  }

  // ===== Gallery helper =====
  function setGallery(mainImgEl, thumbsEl, images, initial = 0) {
    if (!mainImgEl || !thumbsEl) return;

    const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];

    function showPlaceholder() {
      mainImgEl.onerror = null;
      mainImgEl.src = BIN_PLACEHOLDER;
      thumbsEl.innerHTML = "";
    }

    if (!safeImages.length) {
      showPlaceholder();
      return;
    }

    let active = clamp(initial, 0, safeImages.length - 1);

    function renderMain() {
      mainImgEl.onerror = null;
      mainImgEl.src = safeImages[active];
      mainImgEl.onerror = () => {
        mainImgEl.onerror = null;
        mainImgEl.src = BIN_PLACEHOLDER;
      };
    }

    renderMain();

    if (safeImages.length <= 1) {
      thumbsEl.innerHTML = "";
      return;
    }

    thumbsEl.innerHTML = safeImages
      .map((src, idx) => {
        const act = idx === active ? "active" : "";
        return `
          <div class="thumb ${act}" data-idx="${idx}">
            <img src="${src}" alt="thumb ${idx + 1}" onerror="this.src='${BIN_PLACEHOLDER}'" />
          </div>
        `;
      })
      .join("");

    thumbsEl.querySelectorAll(".thumb").forEach((t) => {
      t.addEventListener("click", () => {
        const idx = Number(t.getAttribute("data-idx"));
        active = idx;
        renderMain();
        thumbsEl
          .querySelectorAll(".thumb")
          .forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
      });
    });
  }

  // ===== bins =====
  async function fetchTrashBinsFromApi() {
    try {
      const res = await authFetch("/api/trashbins?size=1000&page=0", {
        cache: "no-store",
      });

      const j = await res.json().catch(() => ({}));

      if (isAuthExpiredResponse(res, j)) {
        await redirectToLoginBecauseTokenExpired();
        return null;
      }

      if (!res.ok || !j?.ok) {
        console.error("Trashbins GET error:", res.status, j);
        return null;
      }

      return Array.isArray(j.items) ? j.items : [];
    } catch (e) {
      console.error("Trashbins fetch failed:", e);
      return null;
    }
  }

  function setBinsFromBackend(items) {
    bins = items
      .filter(
        (x) =>
          typeof x?.latitude === "number" && typeof x?.longitude === "number"
      )
      .map((x) => {
        const fill = clamp(Number(x.fillLevel ?? 0), 0, 100);
        const st = String(x.status || "").toUpperCase();
        const isRed = st === "FULL" || fill >= 80;

        return {
          id: String(x.id),
          name: x.name || `Bin #${x.id}`,
          status: isRed ? "red" : "green",
          fill,
          lat: Number(x.latitude),
          lng: Number(x.longitude),
          updatedAt: x?.updatedAt ? new Date(x.updatedAt) : new Date(),
          images: buildBinImages(x),
          raw: x,
        };
      });

    if (kpiTotal) kpiTotal.textContent = String(bins.length);
  }

  async function loadRegion() {
    const r = await fetch("/samarqandsh.json");
    if (!r.ok) {
      alert(`samarqandsh.json topilmadi (${r.status}). public/ ichida bo‘lsin!`);
      emitMonitoringReady();
      return;
    }

    const geo = await r.json();
    if (!geo?.geometry?.coordinates) {
      alert("samarqandsh.json noto‘g‘ri yoki bo‘sh!");
      emitMonitoringReady();
      return;
    }

    regionMultiPoly = geo.geometry.coordinates;
    regionBBox = bboxOfMultiPolygon(regionMultiPoly);

    if (regionLayer) safeRemoveLayer(regionLayer);

    regionLayer = L.geoJSON(geo, {
      style: {
        color: "#00ff88",
        weight: 3,
        opacity: 1,
        fillColor: "#00ff88",
        fillOpacity: 0.15,
      },
    }).addTo(map);

    map.fitBounds(regionLayer.getBounds(), { padding: [20, 20] });

    const items = await fetchTrashBinsFromApi();

    if (Array.isArray(items)) {
      setBinsFromBackend(items);
    } else {
      bins = [];
      if (kpiTotal) kpiTotal.textContent = "0";
    }

    renderBins();
    renderList();

    if (updatedAt) {
      updatedAt.textContent = "Oxirgi: " + fmtTime(new Date());
    }

    emitMonitoringReady();
  }

  function makeBinImages() {
    return [BIN_PLACEHOLDER];
  }

  function generateBinsInside(count) {
    bins = [];
    binMarkers.clear();

    let tries = 0;
    while (bins.length < count && tries < 200000) {
      tries++;
      const lng = rand(regionBBox.minX, regionBBox.maxX);
      const lat = rand(regionBBox.minY, regionBBox.maxY);

      if (pointInMultiPolygon(lng, lat, regionMultiPoly)) {
        const fill = Math.floor(10 + Math.random() * 91);
        const status = fill >= 80 ? "red" : "green";
        const id = `BIN-${String(bins.length + 1).padStart(2, "0")}`;

        bins.push({
          id,
          name: `Hudud #${bins.length + 1}`,
          status,
          fill,
          lat,
          lng,
          updatedAt: new Date(),
          images: makeBinImages(id),
        });
      }
    }

    if (kpiTotal) kpiTotal.textContent = String(count);
  }

  function renderBins() {
    removeAllBinMarkers();

    const pts = [];

    bins.forEach((b) => {
      const icon = b.status === "red" ? redIcon : greenIcon;
      const marker = L.marker([b.lat, b.lng], { icon });

      const ok =
        markerFilter === "all" ||
        (markerFilter === "red" && b.status === "red") ||
        (markerFilter === "green" && b.status === "green");

      if (ok) {
        marker.addTo(map);
        pts.push([b.lat, b.lng]);
      }

      marker.on("click", () => openBin(b.id));
      binMarkers.set(b.id, marker);
    });

    if (pts.length) {
      map.fitBounds(pts, { padding: [30, 30] });
    }

    renderList();
    updateKpi();
  }

  function updateKpi() {
    const reds = bins.filter((b) => b.status === "red").length;
    if (kpiRed) kpiRed.textContent = String(reds);
    if (updatedAt) updatedAt.textContent = "Oxirgi: " + fmtTime(new Date());
  }

  function renderList() {
    if (!itemsEl) return;

    const q = (searchEl?.value || "").toLowerCase().trim();

    const base = bins.filter(
      (b) =>
        markerFilter === "all" ||
        (markerFilter === "red" && b.status === "red") ||
        (markerFilter === "green" && b.status === "green")
    );

    const filtered = base.filter((b) => {
      const s = `${b.name} ${b.id} ${b.status}`.toLowerCase();
      return !q || s.includes(q);
    });

    const sorted = [
      ...filtered
        .filter((b) => b.status === "red")
        .sort((a, b) => b.fill - a.fill),
      ...filtered
        .filter((b) => b.status !== "red")
        .sort((a, b) => b.fill - a.fill),
    ];

    if (!sorted.length) {
      itemsEl.innerHTML = `
        <div class="cardItem" style="cursor:default;">
          <div class="cardTitle">Ma’lumot topilmadi</div>
          <div class="cardMeta">Backend ishlamayapti yoki trashbinlar hali qo‘shilmagan.</div>
        </div>
      `;
      return;
    }

    itemsEl.innerHTML = sorted
      .map((b) => {
        const active = b.id === selectedId ? " active" : "";
        const statusText = b.status === "red" ? "To‘la" : "Bo‘sh / Normal";
        const cls = `cardItem ${b.status}${active}`;
        return `
          <div class="${cls}" data-id="${b.id}">
            <div class="cardTitle">${escapeHtml(b.name)}</div>
            <div class="cardMeta">Status: <b>${statusText}</b> • ${b.fill}%</div>
            <div class="cardCoord">${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}</div>
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".cardItem").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        focusBin(id);
        openBin(id);
      });
    });
  }

  function focusBin(id) {
    const b = bins.find((x) => x.id === id);
    if (!b || !map) return;
    map.setView([b.lat, b.lng], 15, { animate: true });
  }

  function focusBinWithHighlight(id) {
    const b = bins.find((x) => x.id === id);
    if (!b || !map) return;

    clearFocusedBin();

    map.flyTo([b.lat, b.lng], Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.8,
    });

    activeFocusMarker = L.marker([b.lat, b.lng], {
      interactive: false,
      zIndexOffset: 2000,
      icon: L.divIcon({
        className: "focusPulseWrap",
        html: `<div class="focusPulseDot"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(map);

    activeFocusPopup = L.popup({
      closeButton: false,
      autoClose: true,
      closeOnClick: true,
      offset: [0, -18],
      className: "focusHintPopup",
    })
      .setLatLng([b.lat, b.lng])
      .setContent(`
        <div class="focusHintPopupInner">
          <b>${escapeHtml(b.name)}</b>
          <span>${b.fill}% • ${b.status === "red" ? "To‘la" : "Normal"}</span>
        </div>
      `);

    activeFocusPopup.openOn(map);

    activeFocusTimer = setTimeout(() => {
      clearFocusedBin();
    }, 4500);
  }

  // ===== SmartGPS cars =====
  function getCarsSafe() {
    return Array.isArray(window?.SmartGPS?.cars) ? window.SmartGPS.cars : [];
  }

  function nearestCarToBin(bin) {
    const list = getCarsSafe();
    if (!list.length) return null;

    let best = null,
      bestD = Infinity;
    for (const c of list) {
      if (typeof c?.lat !== "number" || typeof c?.lng !== "number") continue;
      const d = dist2({ lat: c.lat, lng: c.lng }, { lat: bin.lat, lng: bin.lng });
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  function openBin(id) {
    const b = bins.find((x) => x.id === id);
    if (!b) return;

    selectedId = id;
    renderList();

    setGallery(mMainImg, mThumbs, b.images, 0);

    const statusText = b.status === "red" ? "TO‘LA (QIZIL)" : "NORMAL (YASHIL)";
    if (mTitle) mTitle.textContent = `${b.name} • ${b.id}`;

    if (mBadgeStatus) {
      mBadgeStatus.textContent = b.status === "red" ? "QIZIL" : "YASHIL";
      mBadgeStatus.className = `badge ${b.status}`;
    }

    if (mBadgeFill) {
      mBadgeFill.textContent = `${b.fill}%`;
      mBadgeFill.className = "badge soft";
    }

    if (mStatus) {
      mStatus.innerHTML =
        b.status === "red"
          ? `<span style="color:#ef4444;font-weight:900">${statusText}</span>`
          : `<span style="color:#22c55e;font-weight:900">${statusText}</span>`;
    }

    if (mFill) mFill.textContent = `${b.fill}%`;
    if (mCoord) mCoord.textContent = `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}`;
    if (mUpd) mUpd.textContent = fmtTime(b.updatedAt);

    const carsList = getCarsSafe();
    const near = b.status === "red" ? nearestCarToBin(b) : null;

    if (cleanBtn) {
      if (b.fill === 100) {
        cleanBtn.style.display = "inline-block";
        cleanBtn.onclick = () => cleanBin(id);
      } else {
        cleanBtn.style.display = "none";
        cleanBtn.onclick = null;
      }
    }

    if (modalBack) modalBack.style.display = "flex";
  }

  function cleanBin(id) {
    const b = bins.find((x) => x.id === id);
    if (!b) return;

    b.fill = 0;
    b.status = "green";
    b.updatedAt = new Date();

    const marker = binMarkers.get(id);
    if (marker) marker.setIcon(greenIcon);

    renderBins();
    openBin(id);
  }

  // ===== Stats =====
  let statsChart = null;

  function applyFilter(f) {
    markerFilter = f;
    renderBins();
  }

  function openStats() {
    const total = bins.length;
    const red = bins.filter((b) => b.status === "red").length;
    const green = total - red;

    if (sTotal) sTotal.textContent = total;
    if (sRed) sRed.textContent = red;
    if (sGreen) sGreen.textContent = green;

    const ctx = document.getElementById("statsChart");
    if (!ctx || typeof Chart === "undefined") {
      alert("Chart.js ulanmagan!");
      return;
    }

    const wrap = ctx.parentElement;
    if (wrap) {
      wrap.style.position = "relative";
      wrap.style.width = "100%";
      wrap.style.height = "320px";
      wrap.style.maxHeight = "320px";
      wrap.style.minHeight = "320px";
      wrap.style.overflow = "hidden";
    }

    if (statsChart) statsChart.destroy();

    statsChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Qizil", "Yashil"],
        datasets: [
          {
            data: [red, green],
            borderWidth: 0,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 18,
              boxHeight: 10,
              padding: 16,
              color:
                getComputedStyle(document.body).getPropertyValue("--text") ||
                "#0f172a",
              font: {
                size: 13,
                weight: "700",
              },
            },
          },
        },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          applyFilter(idx === 0 ? "red" : "green");
        },
      },
    });

    if (statsBack) statsBack.style.display = "flex";
  }

  function closeStats() {
    if (statsBack) statsBack.style.display = "none";
  }

  // ===== Car bridge =====
  function runCarAction(detail) {
    if (!detail) return false;

    const id = Number(detail.id);
    const lat = Number(detail.lat);
    const lng = Number(detail.lng);
    const mode = detail.mode || "focus";

    let handled = false;

    try {
      if (window?.SmartGPS) {
        if (typeof window.SmartGPS.focusCar === "function") {
          window.SmartGPS.focusCar(id);
          handled = true;
        }

        if (
          (mode === "open" || mode === "info") &&
          typeof window.SmartGPS.openCar === "function"
        ) {
          window.SmartGPS.openCar(id);
          handled = true;
        }

        if (
          mode === "track24h" &&
          typeof window.SmartGPS.trackCar24h === "function"
        ) {
          window.SmartGPS.trackCar24h(id);
          handled = true;
        }
      }
    } catch (_) {}

    try {
      if (mode === "track24h") {
        window.dispatchEvent(
          new CustomEvent("smartgps:track24h", { detail: { id } })
        );
      } else if (mode === "open" || mode === "info") {
        window.dispatchEvent(
          new CustomEvent("smartgps:open", { detail: { id } })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("smartgps:focus", { detail: { id } })
        );
      }
    } catch (_) {}

    try {
      if (map && Number.isFinite(lat) && Number.isFinite(lng)) {
        map.setView([lat, lng], 16, { animate: true });
        handled = true;
      }
    } catch (_) {}

    return handled;
  }

  function runPendingCarAction() {
    let raw = null;

    try {
      raw = sessionStorage.getItem("pending_car_action");
    } catch (_) {}

    if (!raw) return;

    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      try {
        sessionStorage.removeItem("pending_car_action");
      } catch (_) {}
      return;
    }

    let tries = 0;
    const maxTries = 25;

    const timer = setInterval(() => {
      tries += 1;

      const ok = runCarAction(payload);

      if (ok || tries >= maxTries) {
        clearInterval(timer);
        if (ok) {
          try {
            sessionStorage.removeItem("pending_car_action");
          } catch (_) {}
        }
      }
    }, 300);
  }

  function syncThemeState() {
    const theme = localStorage.getItem("ui_theme") || "light";
    document.body.setAttribute("data-theme", theme);
  }

  // ===== public api =====
  window.MonitoringApp = {
    start() {
      if (started) return;

      const mapEl = document.getElementById("map");
      if (!mapEl) return;

      if (!window.L) {
        console.log("Leaflet hali yuklanmadi");
        return;
      }

      started = true;

      // refs
      itemsEl = document.getElementById("items");
      searchEl = document.getElementById("search");
      kpiTotal = document.getElementById("kpiTotal");
      kpiRed = document.getElementById("kpiRed");
      updatedAt = document.getElementById("updatedAt");

      modalBack = document.getElementById("modalBack");
      mClose = document.getElementById("mClose");
      mFocus = document.getElementById("mFocus");
      mTitle = document.getElementById("mTitle");
      mStatus = document.getElementById("mStatus");
      mFill = document.getElementById("mFill");
      mCoord = document.getElementById("mCoord");
      mUpd = document.getElementById("mUpd");
      cleanBtn = document.getElementById("cleanBtn");

      mMainImg = document.getElementById("mMainImg");
      mThumbs = document.getElementById("mThumbs");
      mBadgeStatus = document.getElementById("mBadgeStatus");
      mBadgeFill = document.getElementById("mBadgeFill");

      statsBack = document.getElementById("statsBack");
      statsClose = document.getElementById("statsClose");
      sTotal = document.getElementById("sTotal");
      sRed = document.getElementById("sRed");
      sGreen = document.getElementById("sGreen");


      // map init
      map = L.map("map", { zoomControl: false }).setView([39.65, 66.95], 12);
      window.map = map;
      window.MonitoringApp.map = map;

      const tiles = {
        light: L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          { maxZoom: 20 }
        ),
        dark: L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          { maxZoom: 20 }
        ),
        sat: L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 20 }
        ),
      };

      const activeStyleBtn = document.querySelector(".mapTypeStack .segBtn.active");
      const initialStyle = activeStyleBtn?.dataset?.style || "light";

      if (tiles[initialStyle]) {
        tiles[initialStyle].addTo(map);
      } else {
        tiles.dark.addTo(map);
      }

      const iconDot = (color) =>
        L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid rgba(255,255,255,.9);box-shadow:0 10px 18px rgba(0,0,0,.25);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      greenIcon = iconDot("#22c55e");
      redIcon = iconDot("#ef4444");

      // zoom
      document.getElementById("zoomIn")?.addEventListener("click", () => map.zoomIn());
      document.getElementById("zoomOut")?.addEventListener("click", () => map.zoomOut());

      // tile switch
      document.querySelectorAll(".mapTypeStack .segBtn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".mapTypeStack .segBtn")
            .forEach((b) => b.classList.remove("active"));

          btn.classList.add("active");

          const style = btn.dataset.style;

          Object.values(tiles).forEach((t) => {
            if (map.hasLayer(t)) map.removeLayer(t);
          });

          if (style && tiles[style]) {
            tiles[style].addTo(map);
          }
        });
      });

      // list search
      if (searchEl && !searchEl.__bound) {
        searchEl.addEventListener("input", renderList);
        searchEl.__bound = true;
      }

      // modal bind
      if (mClose) {
        mClose.onclick = () => {
          if (modalBack) modalBack.style.display = "none";
        };
      }

      if (modalBack) {
        modalBack.onclick = (e) => {
          if (e.target === modalBack) modalBack.style.display = "none";
        };
      }

      if (mFocus) {
        mFocus.onclick = () => {
          if (selectedId) {
            focusBinWithHighlight(selectedId);
          }
          if (modalBack) modalBack.style.display = "none";
        };
      }

      // fit/refresh bins
      document.getElementById("btnFit")?.addEventListener("click", () => {
        if (regionLayer) map.fitBounds(regionLayer.getBounds(), { padding: [20, 20] });
      });

      document.getElementById("btnRefresh")?.addEventListener("click", () => {
        bins.forEach((b) => {
          const delta = Math.round(Math.random() * 14 - 6);
          b.fill = clamp(b.fill + delta, 0, 100);
          b.status = b.fill >= 80 ? "red" : "green";
          b.updatedAt = new Date();
        });

        bins.forEach((b) => {
          const m = binMarkers.get(b.id);
          if (m) m.setIcon(b.status === "red" ? redIcon : greenIcon);
        });

        renderBins();
      });

      // stats
      document.getElementById("infoBtn")?.addEventListener("click", openStats);

      if (statsClose) statsClose.onclick = closeStats;
      if (statsBack) {
        statsBack.onclick = (e) => {
          if (e.target === statsBack) closeStats();
        };
      }

      document.getElementById("fAll")?.addEventListener("click", () => applyFilter("all"));
      document.getElementById("fRed")?.addEventListener("click", () => applyFilter("red"));
      document.getElementById("fGreen")?.addEventListener("click", () => applyFilter("green"));

      // cars toggle event
      document.getElementById("toggleCar")?.addEventListener("click", () => {
        window.dispatchEvent(new Event("smartgps:toggle"));
      });

      // theme state react orqali boshqariladi
      syncThemeState();
      document.addEventListener("keydown", onKeyDown);

      carBridgeHandler = (e) => {
        runCarAction(e?.detail || {});
      };

      window.addEventListener("monitor:car-action", carBridgeHandler);

      loadRegion();
      runPendingCarAction();
    },

    applyFilterFromStats(filter) {
      applyFilter(filter);
      closeStats();
    },

    rebindMonitorUI() {
      itemsEl = document.getElementById("items");
      searchEl = document.getElementById("search");

      if (searchEl && !searchEl.__bound) {
        searchEl.addEventListener("input", renderList);
        searchEl.__bound = true;
      }

      renderList();
    },

    stop() {
      if (!started) return;

      try {
        document.removeEventListener("keydown", onKeyDown);
      } catch (_) {}

      try {
        if (carBridgeHandler) {
          window.removeEventListener("monitor:car-action", carBridgeHandler);
        }
      } catch (_) {}
      carBridgeHandler = null;

      clearFocusedBin();
      removeAllBinMarkers();
      safeRemoveLayer(regionLayer);
      regionLayer = null;

      try {
        if (map) {
          map.off();
          map.remove();
        }
      } catch (_) {}

      map = null;
      started = false;
      selectedId = null;
    },
  };

  function onKeyDown(e) {
    if (!e.ctrlKey) return;
    const k = e.key.toLowerCase();

    if (k === "l") {
      e.preventDefault();
      searchEl?.focus();
    }
  }
})();