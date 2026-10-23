(() => {
  "use strict";

  const root = document.body.dataset.root || "";
  const index = Array.isArray(window.MODEL_ATLAS_SEARCH) ? window.MODEL_ATLAS_SEARCH : [];
  const typeLabels = { category: "类别", provider: "厂商", model: "型号" };
  const typeOrder = { category: 0, provider: 1, model: 2 };
  const groupLabels = { category: "API 类别", provider: "厂商", model: "型号" };

  const normalize = (value = "") =>
    String(value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  /* ------------------------------------------------------------------------
     Header: glass on scroll + mobile navigation
     ------------------------------------------------------------------------ */

  const homeLink = document.querySelector("[data-home-link]");
  if (homeLink && window.location.pathname !== "/") {
    document.documentElement.classList.add("has-home-link");
  }

  const siteHeader = document.querySelector("[data-site-header]");
  if (siteHeader) {
    const onScroll = () => siteHeader.classList.toggle("is-scrolled", window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");

  if (navToggle && navLinks) {
    document.documentElement.classList.add("nav-ready");

    const setNavOpen = (open) => {
      navLinks.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
    };

    navToggle.addEventListener("click", () => {
      setNavOpen(!navLinks.classList.contains("is-open"));
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) setNavOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setNavOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) setNavOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     Full-site search
     ------------------------------------------------------------------------ */

  const dialog = document.querySelector("#search-dialog");
  const searchInput = document.querySelector("#site-search");
  const searchStatus = document.querySelector("#search-status");
  const searchResults = document.querySelector("#search-results");
  const searchOpeners = [...document.querySelectorAll("[data-search-open]")];
  const searchClose = document.querySelector("[data-search-close]");
  let lastTrigger = null;
  let resultLinks = [];
  let activeIndex = -1;

  const countByType = (type) => index.filter((entry) => entry.type === type).length;

  function setStatus(text) {
    if (searchStatus) searchStatus.textContent = text;
  }

  function setActive(nextIndex) {
    if (!resultLinks.length) {
      activeIndex = -1;
      return;
    }

    activeIndex = Math.max(0, Math.min(nextIndex, resultLinks.length - 1));
    resultLinks.forEach((link, indexOfLink) => {
      const selected = indexOfLink === activeIndex;
      link.classList.toggle("is-active", selected);
      link.setAttribute("aria-selected", String(selected));
    });

    const activeLink = resultLinks[activeIndex];
    if (activeLink) {
      activeLink.scrollIntoView({ block: "nearest" });
      searchInput?.setAttribute("aria-activedescendant", activeLink.id);
    }
  }

  function clearActive() {
    activeIndex = -1;
    resultLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.setAttribute("aria-selected", "false");
    });
    searchInput?.removeAttribute("aria-activedescendant");
  }

  function createEmptyState(query) {
    const empty = document.createElement("div");
    empty.className = "search-empty-state";

    const icon = document.createElement("span");
    icon.innerHTML = '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.75" cy="10.75" r="6.25"></circle><path d="m15.5 15.5 4.5 4.5"></path></svg>';

    const title = document.createElement("strong");
    title.textContent = query ? `没有找到“${query}”` : "搜索索引暂不可用";

    const copy = document.createElement("p");
    copy.textContent = query ? "试试厂商名、模型名，或“语音”“视频”这样的类别词。" : "请重新加载页面后再试。";

    empty.append(icon, title, copy);
    return empty;
  }

  function createResult(entry) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = `${root}${entry.href}`;
    link.setAttribute("role", "option");
    link.setAttribute("aria-selected", "false");
    link.tabIndex = -1;

    const type = document.createElement("span");
    type.className = "search-result__type";
    type.textContent = typeLabels[entry.type] || "条目";

    const copy = document.createElement("span");
    copy.className = "search-result__copy";
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const meta = document.createElement("small");
    meta.textContent = entry.meta;
    copy.append(title, meta);

    const price = document.createElement("span");
    price.className = "search-result__price";
    price.textContent = entry.price || "";

    link.append(type, copy, price);
    link.addEventListener("mouseenter", () => setActive(Number(link.dataset.index)));
    return link;
  }

  function renderGroup(groupType, entries, query) {
    if (!entries.length) return;
    const group = document.createElement("section");
    group.className = "search-group";

    const label = document.createElement("p");
    label.className = "search-group__label";
    label.textContent = groupLabels[groupType] || query;
    group.append(label);

    for (const entry of entries) {
      const link = createResult(entry);
      resultLinks.push(link);
      group.append(link);
    }

    searchResults.append(group);
  }

  function scoreEntry(entry, query) {
    const title = normalize(entry.title);
    const meta = normalize(entry.meta);
    const keywords = normalize(entry.keywords);

    let score = 0;
    if (title === query) score += 120;
    else if (title.startsWith(query)) score += 70;
    else if (title.includes(query)) score += 45;
    if (meta.includes(query)) score += 16;
    if (keywords.includes(query)) score += 8;
    if (!score) return 0;

    const tokens = query.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((token) => `${title} ${meta} ${keywords}`.includes(token))) {
      score += 20;
    }
    return score;
  }

  function renderSearch(rawQuery = "") {
    if (!searchResults || !searchInput) return;
    const query = normalize(rawQuery);
    searchResults.replaceChildren();
    resultLinks = [];
    activeIndex = -1;
    searchInput.removeAttribute("aria-activedescendant");

    if (!query) {
      const categories = index.filter((entry) => entry.type === "category");
      const providers = index.filter((entry) => entry.type === "provider").slice(0, 5);
      renderGroup("category", categories, "快速入口");
      renderGroup("provider", providers, "快速入口");
      setStatus(
        index.length
          ? `快速入口 · ${countByType("provider")} 家厂商 / ${countByType("model")} 个型号，输入关键字可全站检索。`
          : "搜索索引暂不可用。",
      );
    } else {
      const entries = index
        .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || typeOrder[a.entry.type] - typeOrder[b.entry.type])
        .slice(0, 30)
        .map((item) => item.entry);

      if (!entries.length) {
        searchResults.append(createEmptyState(rawQuery.trim()));
        setStatus(`“${rawQuery.trim()}”没有匹配结果。`);
        return;
      }

      for (const type of ["category", "provider", "model"]) {
        renderGroup(type, entries.filter((entry) => entry.type === type), rawQuery);
      }

      setStatus(`找到 ${entries.length} 条结果${entries.length === 30 ? "（仅显示前 30 条）" : ""}。`);
    }

    resultLinks.forEach((link, position) => {
      link.id = `search-result-${position}`;
      link.dataset.index = String(position);
    });
  }

  function openSearch(prefill = "") {
    if (!dialog || typeof dialog.showModal !== "function") return;
    lastTrigger = document.activeElement;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("page-search-open");
    searchOpeners.forEach((button) => button.setAttribute("aria-expanded", "true"));
    if (searchInput) {
      searchInput.value = prefill;
      renderSearch(prefill);
      requestAnimationFrame(() => {
        searchInput.focus();
        if (prefill) searchInput.select();
      });
    }
  }

  function closeSearch() {
    if (!dialog?.open) return;
    dialog.close();
  }

  if (dialog && searchInput && searchResults) {
    searchOpeners.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => openSearch());
    });

    searchClose?.addEventListener("click", closeSearch);

    searchInput.setAttribute("role", "combobox");
    searchInput.setAttribute("aria-autocomplete", "list");
    searchInput.setAttribute("aria-expanded", "true");
    searchInput.setAttribute("aria-controls", "search-results");
    searchResults.setAttribute("role", "listbox");
    searchResults.setAttribute("aria-label", "搜索结果");

    searchInput.addEventListener("input", () => renderSearch(searchInput.value));

    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (activeIndex < 0) setActive(0);
        else setActive(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (activeIndex <= 0) clearActive();
        else setActive(activeIndex - 1);
      } else if (event.key === "Enter") {
        const target = resultLinks[activeIndex] || resultLinks[0];
        if (target) {
          event.preventDefault();
          target.click();
        }
      }
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeSearch();
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("page-search-open");
      searchOpeners.forEach((button) => button.setAttribute("aria-expanded", "false"));
      if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable);

      if ((event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        openSearch();
      }
    });

    renderSearch("");
  }

  /* ------------------------------------------------------------------------
     Vendor directory filters
     ------------------------------------------------------------------------ */

  const filterPanel = document.querySelector("[data-filter-panel]");
  const vendorGrid = document.querySelector("[data-vendor-grid]");
  const vendorCards = vendorGrid ? [...vendorGrid.querySelectorAll("[data-vendor-card]")] : [];

  if (filterPanel && vendorGrid && vendorCards.length) {
    const filterInput = filterPanel.querySelector("#vendor-filter");
    const filterCount = filterPanel.querySelector("#vendor-filter-count");
    const filterClear = filterPanel.querySelector("[data-filter-clear]");
    const resetButton = document.querySelector("[data-filter-reset]");
    const emptyState = document.querySelector("[data-vendor-empty]");
    const chips = [...filterPanel.querySelectorAll("[data-filter-category]")];
    let activeCategory = "all";

    chips.forEach((chip) => {
      const selected = chip.dataset.filterCategory === activeCategory;
      chip.setAttribute("aria-pressed", String(selected));
    });

    function applyFilters() {
      const rawQuery = filterInput?.value || "";
      const tokens = normalize(rawQuery).split(" ").filter(Boolean);
      let visible = 0;

      for (const card of vendorCards) {
        const categories = (card.dataset.categories || "").split(" ");
        const categoryMatch = activeCategory === "all" || categories.includes(activeCategory);
        const searchable = normalize(card.dataset.search || "");
        const queryMatch = tokens.every((token) => searchable.includes(token));
        const show = categoryMatch && queryMatch;
        card.hidden = !show;
        if (show) visible += 1;
      }

      document.querySelectorAll("[data-vendor-group]").forEach((group) => {
        group.hidden = !group.querySelector("[data-vendor-card]:not([hidden])");
      });

      if (filterCount) filterCount.textContent = `显示 ${visible} 家厂商`;
      if (emptyState) emptyState.hidden = visible !== 0;
      if (filterClear) filterClear.hidden = rawQuery.length === 0;
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        activeCategory = chip.dataset.filterCategory || "all";
        chips.forEach((item) => {
          const selected = item === chip;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        applyFilters();
      });
    });

    filterInput?.addEventListener("input", applyFilters);
    filterClear?.addEventListener("click", () => {
      if (!filterInput) return;
      filterInput.value = "";
      filterInput.focus();
      applyFilters();
    });

    resetButton?.addEventListener("click", () => {
      activeCategory = "all";
      if (filterInput) filterInput.value = "";
      chips.forEach((chip) => {
        const selected = chip.dataset.filterCategory === "all";
        chip.classList.toggle("is-active", selected);
        chip.setAttribute("aria-pressed", String(selected));
      });
      applyFilters();
      filterInput?.focus();
    });

    applyFilters();
  }

  /* ------------------------------------------------------------------------
     Copy model IDs
     ------------------------------------------------------------------------ */

  const toast = document.querySelector("#copy-toast");
  let toastTimer;
  let copiedTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    if (!ok) throw new Error("Copy failed");
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;

    const value = button.getAttribute("data-copy") || "";
    if (!value) return;

    try {
      await copyText(value);
      button.classList.add("is-copied");
      showToast(`${value} 已复制`);
      window.clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => button.classList.remove("is-copied"), 1700);
    } catch (error) {
      showToast("复制失败，请手动选择型号 ID");
    }
  });
})();
