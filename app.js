/* ============================================================
   LEAKEPEDIA — app.js
   Newspaper editorial archive: search, filters, sort, ticker,
   stats, modal (article view), consent, back-to-top, share.
   No frameworks. No trackers. One localStorage flag.
   ============================================================ */

(function () {
  "use strict";

  /* ── helpers ── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    const m = d.toLocaleString("en-IN", { month: "short" });
    const y = d.getFullYear();
    // If day component is "01" treat it as "month unknown — defaulted to 1st"
    const dayStr = iso.slice(8);
    const day = dayStr === "01" ? "" : String(d.getDate()) + " ";
    return { day, mon: m, yr: String(y), full: day ? `${day}${m} ${y}` : `${m} ${y}` };
  };

  const commonsURL = (file, w) =>
    "https://commons.wikimedia.org/wiki/Special:FilePath/" +
    encodeURIComponent(file.replace(/ /g, "_")) +
    (w ? "?width=" + w : "");

  const commonsPage = (file) =>
    "https://commons.wikimedia.org/wiki/File:" + file.replace(/ /g, "_");

  // Year range filter (replaces fragile prefix-matching)
  const ERA_RANGES = {
    "2000s": [2000, 2009],
    "2010s": [2010, 2019],
    "2020s": [2020, 2029],
  };

  /* ── status styling ── */
  const STATUS_CLASS = {
    "Cancelled & retest": "green",
    "Arrests & FIR": "red",
    "Probe ordered": "amber",
    "Convictions": "teal",
    "Results nullified": "teal",
    "Ongoing": "amber",
    "Alleged only": "plain",
  };
  const STATUS_EMOJI = {
    "Cancelled & retest": "🚫 Cancelled & retest",
    "Arrests & FIR": "🚔 Arrests & FIR",
    "Probe ordered": "🔍 Probe ordered",
    "Convictions": "⚖️ Convictions",
    "Results nullified": "❌ Results nullified",
    "Alleged only": "🤔 Alleged only",
  };

  const regionLabel = (r) =>
    ({ "All-India": "All-India", North: "North India", West: "West & Central", East: "East India", South: "South India", Northeast: "Northeast" }[r] || r);

  /* ============================================================
     MOBILE NAV TOGGLE
     ============================================================ */
  const navToggle = $("#nav-toggle");
  const mainNav = $("#main-nav");
  if (navToggle && mainNav) {
    const closeNav = (focusToggle) => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      if (focusToggle) navToggle.focus();
    };
    navToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.addEventListener("click", (e) => {
      if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !navToggle.contains(e.target)) closeNav(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mainNav.classList.contains("open")) closeNav(true);
    });
  }

  /* ============================================================
     DATA GUARD — if data.js failed to load, show an error
     ============================================================ */
  if (typeof INCIDENTS === "undefined" || !Array.isArray(INCIDENTS) || !INCIDENTS.length) {
    const listEl = document.getElementById("case-list");
    if (listEl) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="big">⚠️ Archive failed to load</div>
        <p>The data file could not be loaded. Please refresh the page or check your connection.</p>
      </div>`;
    }
    console.error("LEAKEPEDIA: INCIDENTS not defined — data.js may have failed to load.");
    return;
  }

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  const io =
    "IntersectionObserver" in window &&
    new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 }
    );
  $$(".reveal").forEach((el) => io && io.observe(el));

  /* ============================================================
     FOOTER YEAR
     ============================================================ */
  $$(".js-year").forEach((el) => (el.textContent = String(new Date().getFullYear())));

  /* ============================================================
     SHARED DISCLAIMER (rendered once from JS — single source)
     ============================================================ */
  const DISCLAIMER_HTML = `
    <div class="disclaimer">
      <h3>⚠️ Disclaimer</h3>
      <p>
        This project is made <b>for public interest, education, and research purposes only</b>.
        All data has been compiled from publicly available sources (Wikipedia, news reports, court records)
        — linked on every entry. This is <b>not</b> an official record and has no affiliation with any
        government body, exam agency, or coaching institute. Research and compilation done by
        <b>one person with assistance from AI research tools</b>. For queries, corrections, or concerns,
        contact <a href="mailto:sahilpsycheofficial@gmail.com">sahilpsycheofficial@gmail.com</a>.
      </p>
    </div>`;
  $$("[id='disclaimer-block']").forEach((el) => (el.innerHTML = DISCLAIMER_HTML));

  /* ============================================================
     PRIVACY NOTICE / COOKIE BAR
     ============================================================ */
  const bar = $("#cookiebar");
  if (bar) {
    const KEY = "leakepedia_notice_ok";
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch (e) { /* private mode */ }
    if (!dismissed) {
      setTimeout(() => bar.classList.add("show"), 900);
      const okBtn = $("#cookie-ok");
      if (okBtn) {
        okBtn.addEventListener("click", () => {
          bar.classList.remove("show");
          try { localStorage.setItem(KEY, "1"); } catch (e) {}
        });
      }
    }
  }

  /* ============================================================
     BACK TO TOP
     ============================================================ */
  const backBtn = document.getElementById("back-to-top");
  if (backBtn) {
    const toggleBackBtn = () => {
      if (window.scrollY > 500) {
        backBtn.classList.add("show");
      } else {
        backBtn.classList.remove("show");
      }
    };
    window.addEventListener("scroll", toggleBackBtn, { passive: true });
    backBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  /* ============================================================
     HOME: COMPUTED STATS (from live data)
     ============================================================ */
  const statIncidents = document.getElementById("stat-incidents");
  const statYears     = document.getElementById("stat-years");
  const statStates    = document.getElementById("stat-states");
  const statCancelled = document.getElementById("stat-cancelled");

  if (statIncidents) {
    const years     = new Set(INCIDENTS.map((i) => i.date.slice(0, 4)));
    const states    = new Set(INCIDENTS.map((i) => i.state));
    const cancelled = INCIDENTS.filter((i) => /Cancelled|nullified/i.test(i.status)).length;

    // Animate counter up
    function animateCount(el, target, suffix) {
      const num = parseInt(target, 10);
      let start = 0;
      const dur = 1200;
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * num) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    // Trigger counter when stat bar is visible
    const statBar = document.getElementById("stat-bar");
    if (statBar && "IntersectionObserver" in window) {
      const statsIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(statIncidents, INCIDENTS.length, "+");
            animateCount(statYears,     years.size,        "");
            animateCount(statStates,    states.size,       "+");
            animateCount(statCancelled, cancelled,         "+");
            statsIO.disconnect();
          }
        });
      }, { threshold: 0.3 });
      statsIO.observe(statBar);
    } else if (statIncidents) {
      statIncidents.textContent = INCIDENTS.length;
      if (statYears)     statYears.textContent     = years.size;
      if (statStates)    statStates.textContent     = states.size + "+";
      if (statCancelled) statCancelled.textContent  = cancelled;
    }
  }

  /* ============================================================
     HOME: LIVE TICKER
     ============================================================ */
  const track = $("#ticker-track");
  if (track) {
    const recent = [...INCIDENTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 16);
    const items = recent.map(
      (i) =>
        `<a href="archive.html#e-${i.id}"><b>${esc(fmtDate(i.date).full)}</b> 📰 ${esc(i.exam)} — ${esc(i.state)}</a>`
    );
    track.innerHTML = items.join("") + items.join(""); // duplicate for seamless loop
  }

  /* ============================================================
     PROTESTS GALLERY
     ============================================================ */
  const gallery = $("#gallery");
  if (gallery && typeof PROTEST_IMAGES !== "undefined") {
    gallery.innerHTML = PROTEST_IMAGES.map(
      (im) => `
      <figure class="frame ${im.wide ? "wide-frame" : ""} reveal">
        <a href="${commonsPage(im.file)}" target="_blank" rel="noopener" title="View source file on Wikimedia Commons">
          <img src="${commonsURL(im.file, im.wide ? 1600 : 900)}"
               alt="${esc(im.alt || im.caption)}"
               loading="lazy">
        </a>
        <figcaption>
          <div class="cap-title">${esc(im.caption)}</div>
          <div class="cap-meta">Photograph: <a href="${commonsPage(im.file)}" target="_blank" rel="noopener">${esc(im.credit)}</a></div>
        </figcaption>
      </figure>`
    ).join("");
    $$(".reveal", gallery).forEach((el) => io && io.observe(el));
  }

  const erasRoot = $("#protest-eras");
  if (erasRoot && typeof PROTEST_ERAS !== "undefined") {
    erasRoot.innerHTML = PROTEST_ERAS.map(
      (p) => `
      <div class="protest-note">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)} <a href="${p.wiki}" target="_blank" rel="noopener">Read more ↗</a></p>
      </div>`
    ).join("");
  }

  /* ============================================================
     MODAL — Case Detail (newspaper article view)
     Focus trap + ESC close + scroll lock
     ============================================================ */
  let modalOverlay = null;
  let lastFocusedEl = null;

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.closest("[aria-hidden]"));
  }

  function trapFocus(e) {
    if (!modalOverlay) return;
    const focusable = getFocusable(modalOverlay);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  }

  function openModal(incident) {
    // Create overlay using CSS classes (not inline styles)
    if (modalOverlay) closeModal();

    lastFocusedEl = document.activeElement;

    modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.setAttribute("role", "dialog");
    modalOverlay.setAttribute("aria-modal", "true");
    modalOverlay.setAttribute("aria-label", incident.exam);

    const d = fmtDate(incident.date);
    const pill = STATUS_CLASS[incident.status] || "plain";
    const emojiLabel = STATUS_EMOJI[incident.status] || incident.status;

    // Build detail paragraphs
    let detailHTML = "";
    if (incident.detail) {
      const paras = incident.detail.split("\n\n").filter(Boolean);
      detailHTML = `<div class="modal-article-text">${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
    } else {
      detailHTML = `<div class="modal-article-text"><p>${esc(incident.summary)}</p></div>`;
    }

    // Key facts box
    const factsHTML = incident.keyFacts
      ? `<div class="modal-key-facts">
          <h4>Key Facts</h4>
          <dl>${incident.keyFacts.map((f) => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join("")}</dl>
        </div>`
      : "";

    // Scale chip
    const scaleHTML = incident.scale
      ? `<span class="chip amber" style="margin-top:8px;display:inline-flex;">📏 ${esc(incident.scale)}</span>`
      : "";

    // Canonical link for sharing (protocol-agnostic)
    const pageDir = location.href.split("#")[0].replace(/[^/]*$/, "");
    const shareURL = pageDir + "archive.html#e-" + incident.id;

    modalOverlay.innerHTML = `
      <div class="modal-content" role="document">
        <button class="modal-close" id="modal-close-btn" aria-label="Close case report">×</button>
        <div class="modal-header">
          <div class="modal-chip-row">
            <span class="chip ${pill}">${esc(emojiLabel)}</span>
            <span class="chip">${esc(incident.type)}</span>
            <span class="chip">${esc(incident.state)}</span>
          </div>
          <h2>${esc(incident.exam)}</h2>
          ${scaleHTML}
          <div class="modal-meta">
            <span>📅 ${d.full}</span>
            <span>🏛️ ${esc(incident.body)}</span>
            <span>📌 ${esc(regionLabel(incident.region))}</span>
          </div>
        </div>
        <div class="modal-body">
          ${factsHTML}
          ${detailHTML}
          <div class="modal-sources-head">Sources &amp; References</div>
          <ul class="modal-sources-list">
            ${incident.sources.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">↗ ${esc(s.label)}</a></li>`).join("")}
          </ul>
          <div class="modal-share-bar">
            <button id="modal-copy-link" aria-label="Copy link to this case">🔗 Copy link</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modalOverlay);
    document.body.style.overflow = "hidden";

    // Activate for CSS transition, then focus the dialog
    modalOverlay.classList.add("active");
    void modalOverlay.offsetWidth; // flush style calc so the dialog is focusable
    const activeFocusable = getFocusable(modalOverlay);
    if (activeFocusable.length) activeFocusable[0].focus();

    // Event listeners
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById("modal-close-btn").addEventListener("click", closeModal);

    document.addEventListener("keydown", handleModalKey);

    // Cross-context clipboard helper (secure + file:// fallback)
    const copyText = (text) => {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise((resolve, reject) => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ta.remove(); reject(e); return; }
        ta.remove();
        if (ok) resolve(); else reject(new Error("copy failed"));
      });
    };
    const flashCopied = (btn) => {
      const original = btn.textContent;
      btn.textContent = "✓ Copied!";
      setTimeout(() => (btn.textContent = original), 2000);
    };

    // Copy link
    const copyBtn = document.getElementById("modal-copy-link");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        copyText(shareURL).then(() => flashCopied(copyBtn)).catch(() => {});
      });
    }
  }

  function handleModalKey(e) {
    if (e.key === "Escape") { closeModal(); return; }
    trapFocus(e);
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleModalKey);
    setTimeout(() => {
      if (modalOverlay) { modalOverlay.remove(); modalOverlay = null; }
      if (lastFocusedEl) { lastFocusedEl.focus(); lastFocusedEl = null; }
    }, 320);
  }

  /* ============================================================
     ARCHIVE — Filter, Search, Sort, Deep Link
     ============================================================ */
  const listRoot = $("#case-list");
  if (listRoot) {
    const q       = $("#f-search");
    const stateEl = $("#f-state");
    const typeEl  = $("#f-type");
    const statusEl = $("#f-status");
    const sortEl  = $("#f-sort");
    const countEl = $("#result-count");
    const resetBtn = $("#reset-filters");
    const eraBtns  = $$(".era-chip");

    if (!q || !stateEl || !typeEl || !statusEl || !sortEl) {
      console.warn("LEAKEPEDIA: filter controls missing");
    }

    // Populate selects from live data
    const allStates   = [...new Set(INCIDENTS.map((i) => i.state))].sort();
    const allTypes    = [...new Set(INCIDENTS.map((i) => i.type))].sort();
    const allStatuses = [...new Set(INCIDENTS.map((i) => i.status))];

    if (stateEl) {
      stateEl.innerHTML =
        '<option value="">All states &amp; UTs</option>' +
        allStates.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    }
    if (typeEl) {
      typeEl.innerHTML =
        '<option value="">All exam types</option>' +
        allTypes.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    }
    if (statusEl) {
      statusEl.innerHTML =
        '<option value="">All outcomes</option>' +
        allStatuses.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    }

    let activeEra = "";

    /* ── Card HTML builder ── */
    const buildCard = (i) => {
      const d = fmtDate(i.date);
      const pill = STATUS_CLASS[i.status] || "plain";
      const emojiLabel = STATUS_EMOJI[i.status] || i.status;
      const hasDetail = !!i.detail;
      const previewText = i.detail ? i.detail.split("\n\n")[0] : "";

      return `
      <article class="case-card" id="e-${i.id}" data-id="${i.id}" role="listitem" tabindex="0"
               aria-label="${esc(i.exam)} — ${d.full}">
        <div class="date-seal" aria-hidden="true">
          <div class="yr">${d.yr}</div>
          <div class="dt">${esc(d.day + d.mon)}</div>
        </div>
        <div class="case-main">
          <h3>${esc(i.exam)}</h3>
          <div class="body">${esc(i.body)} · ${esc(regionLabel(i.region))}</div>
          <div class="case-meta">
            <span class="chip plain">${esc(i.state)}</span>
            <span class="chip">${esc(i.type)}</span>
            <span class="chip ${pill}">${esc(emojiLabel)}</span>
          </div>
          <p class="case-summary">${esc(i.summary)}</p>
          ${hasDetail && previewText ? `<p class="case-detail-preview">${esc(previewText)}</p>` : ""}
          ${i.scale ? `<div class="scale-note">◆ ${esc(i.scale)}</div>` : ""}
          <div class="case-sources">
            ${i.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener" tabindex="-1">Source: ${esc(s.label)}</a>`).join("")}
          </div>
          <div class="read-more-hint" aria-hidden="true">Click for full report →</div>
        </div>
      </article>`;
    };

    /* ── Attach click & keyboard listeners ── */
    const attachListeners = () => {
      $$(".case-card", listRoot).forEach((el) => {
        const open = () => {
          const inc = INCIDENTS.find((i) => String(i.id) === String(el.dataset.id));
          if (inc) openModal(inc);
        };
        el.addEventListener("click", (e) => {
          if (e.target.closest("a")) return;
          open();
        });
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      });
    };

    /* ── Render function ── */
    const render = () => {
      const term = (q ? q.value || "" : "").trim().toLowerCase();
      let rows = INCIDENTS.filter((i) => {
        // Era filter — real year range
        if (activeEra) {
          const range = ERA_RANGES[activeEra];
          if (range) {
            const y = parseInt(i.date.slice(0, 4), 10);
            if (y < range[0] || y > range[1]) return false;
          }
        }
        if (stateEl && stateEl.value && i.state !== stateEl.value) return false;
        if (typeEl  && typeEl.value  && i.type  !== typeEl.value)  return false;
        if (statusEl && statusEl.value && i.status !== statusEl.value) return false;
        if (term) {
          const hay = (
            i.exam + " " + i.body + " " + i.state + " " + i.summary +
            " " + (i.scale || "") + " " + (i.detail || "")
          ).toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      });

      rows.sort((a, b) =>
        sortEl && sortEl.value === "asc"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date)
      );

      if (countEl) {
        countEl.innerHTML = `<small>showing</small> ${rows.length} <small>of</small> ${INCIDENTS.length} <small>documented incidents</small>`;
      }

      listRoot.innerHTML = rows.length
        ? rows.map(buildCard).join("")
        : `<div class="empty-state"><div class="big">Nothing in the ledger matches.</div><p>Loosen a filter or clear the search — every entry here is real, so the list is only as wide as the record.</p></div>`;

      attachListeners();
    };

    // Filter change handlers
    [q, stateEl, typeEl, statusEl, sortEl].filter(Boolean).forEach((el) =>
      el.addEventListener("input", render)
    );

    // Era chip toggle — proper year-range filter
    eraBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const era = btn.dataset.era;
        if (activeEra === era) {
          activeEra = "";
          eraBtns.forEach((b) => b.classList.remove("on"));
        } else {
          activeEra = era;
          eraBtns.forEach((b) => b.classList.remove("on"));
          btn.classList.add("on");
        }
        render();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (q) q.value = "";
        if (stateEl) stateEl.value = "";
        if (typeEl) typeEl.value = "";
        if (statusEl) statusEl.value = "";
        if (sortEl) sortEl.value = "desc";
        activeEra = "";
        eraBtns.forEach((b) => b.classList.remove("on"));
        render();
      });
    }

    /* ── Deep link: archive.html#e-<id> ── */
    const deepLink = () => {
      if (!location.hash) return;
      const id = location.hash.slice(1);
      if (!id.startsWith("e-")) return;
      // Small delay to allow render
      setTimeout(() => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
          target.classList.add("flash");
          setTimeout(() => target.classList.remove("flash"), 2600);
        }
      }, 150);
    };

    render();
    deepLink();
    window.addEventListener("hashchange", deepLink);
  }

})();
