import { escapeAttr, escapeHtml, formatDate } from "./lib.mjs";
import { icon } from "./icons.mjs";

export function pageUrl(root, path = "") {
  if (!path) return root || "./";
  return `${root}${path}`;
}

export function externalLink(href, label, className = "", extra = "") {
  return `<a class="external-link${className ? ` ${className}` : ""}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"${extra ? ` ${extra}` : ""}><span>${escapeHtml(label)}</span>${icon("arrowUpRight", "external-link-icon")}</a>`;
}

export function categoryTag(category, { href = "", compact = false } = {}) {
  const content = `${icon(category.icon)}<span>${escapeHtml(category.name)}</span>`;
  const style = `--cat:${escapeAttr(category.color)};--cat-soft:${escapeAttr(category.soft)}`;
  if (href) {
    return `<a class="category-tag${compact ? " category-tag--compact" : ""}" href="${escapeAttr(href)}" style="${style}">${content}</a>`;
  }
  return `<span class="category-tag${compact ? " category-tag--compact" : ""}" style="${style}">${content}</span>`;
}

export function providerMark(provider, size = "md") {
  return `<span class="vendor-mark vendor-mark--${size}" style="--vendor:${escapeAttr(provider.color)}" aria-hidden="true">${escapeHtml(provider.glyph || provider.name.slice(0, 2))}</span>`;
}

export function providerCategories(provider, limit = 3) {
  const categories = provider.categories.slice(0, limit);
  const overflow = provider.categories.length - categories.length;
  return `${categories
    .map(
      (category) =>
        `<span class="vendor-cat" style="--cat:${escapeAttr(category.color)}">${icon(category.icon)}<span>${escapeHtml(category.name)}</span></span>`,
    )
    .join("")}${overflow > 0 ? `<span class="vendor-cat vendor-cat--more">+${overflow}</span>` : ""}`;
}

export function providerRow(provider, root, extraAttrs = "") {
  const sample = provider.models[0];
  const rank = String(provider.order + 1).padStart(2, "0");
  const free = /^有/.test(provider.freeTier || "") ? '<span class="vendor-free">有免费层</span>' : "";
  return `<a class="vendor-row${provider.isChina ? " vendor-row--cn" : ""}" href="${pageUrl(root, `providers/${provider.slug}/`)}"${extraAttrs}>
    <span class="vendor-row__rank">${rank}</span>
    ${providerMark(provider, "md")}
    <span class="vendor-row__identity">
      <span class="vendor-row__name">
        <strong>${escapeHtml(provider.name)}</strong>
        ${provider.isChina ? '<span class="vendor-cn">中国</span>' : ""}
        ${free}
      </span>
      <small>${escapeHtml(provider.englishName || provider.headquarters || provider.country)} · ${escapeHtml(provider.country)}</small>
    </span>
    <span class="vendor-row__categories">${providerCategories(provider)}</span>
    <span class="vendor-row__models"><strong>${provider.modelCount}</strong><small>型号</small></span>
    <span class="vendor-row__sample">
      <small>代表型号</small>
      <b>${escapeHtml(sample.name)}</b>
      <em>${escapeHtml(sample.price.primary)}${escapeHtml(sample.price.unit || "")}</em>
    </span>
    <span class="vendor-row__go">${icon("arrowRight")}</span>
  </a>`;
}

export function breadcrumb(items, root) {
  return `<nav class="breadcrumb" aria-label="面包屑">
    <a href="${pageUrl(root, "")}">首页</a>
    ${items
      .map((item) => {
        const label = escapeHtml(item.label);
        if (item.href) return `<span class="breadcrumb__sep" aria-hidden="true">/</span><a href="${escapeAttr(item.href)}">${label}</a>`;
        return `<span class="breadcrumb__sep" aria-hidden="true">/</span><span aria-current="page">${label}</span>`;
      })
      .join("")}
  </nav>`;
}

export function sectionHead({ index, eyebrow, title, copy = "", action = "" }) {
  return `<header class="section-head">
    <div class="section-head__title">
      <p class="eyebrow"><span>${escapeHtml(index)}</span>${eyebrow ? `<span>${escapeHtml(eyebrow)}</span>` : ""}</p>
      <h2>${title}</h2>
    </div>
    ${copy || action ? `<div class="section-head__aside">${copy ? `<p>${copy}</p>` : ""}${action}</div>` : ""}
  </header>`;
}

function header(site, categories, root, current, notFound = false) {
  const navItems = [
    ["categories", "分类", `${root}#categories`],
    ["providers", "厂商", pageUrl(root, "providers/")],
    ["about", "方法", pageUrl(root, "about/")],
  ];
  return `<header class="site-header" data-site-header>
    <div class="container header-inner">
      <a class="brand" href="${pageUrl(root, "")}" aria-label="${escapeAttr(site.brand.name)} · ${escapeAttr(site.brand.nameZh)}首页">
        <span class="brand-mark">${icon("mark")}</span>
        <span class="brand-copy">
          <span class="brand-name">${escapeHtml(site.brand.name)}</span>
          <span class="brand-cn">${escapeHtml(site.brand.nameZh)}</span>
        </span>
      </a>
      <nav class="top-nav" id="site-nav" data-nav-links aria-label="主导航">
        ${navItems
          .map(
            ([key, label, href]) =>
              `<a class="top-nav__link${current === key ? " is-active" : ""}" href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`,
          )
          .join("")}
      </nav>
      <div class="header-actions">
        ${notFound ? "" : `<a class="home-link" href="/" data-home-link aria-label="返回网站主页">
          ${icon("home")}
          <span>主页</span>
        </a>`}
        ${notFound ? "" : `<button class="search-trigger" type="button" data-search-open aria-haspopup="dialog" aria-controls="search-dialog">
          ${icon("search")}
          <span class="search-trigger__label">搜索</span>
          <kbd>/</kbd>
        </button>`}
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="打开导航菜单">
          ${icon("menu")}
        </button>
      </div>
    </div>
  </header>`;
}

function footer(site, categories, root) {
  const year = site.updatedAt.slice(0, 4);
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-main">
        <div class="footer-brand">
          <a class="footer-wordmark" href="${pageUrl(root, "")}" aria-label="返回首页">
            <span class="brand-mark">${icon("mark")}</span>
            <span>Model Atlas</span>
          </a>
          <p>国内外主流模型 API 价格一览。</p>
          <p class="footer-edition">${escapeHtml(site.edition)} · 最后核对 ${formatDate(site.updatedAt)}</p>
          <p class="footer-note">本站只收录模型信息与公开价格，不提供 API 服务。</p>
        </div>
        <div class="footer-directory">
          <div class="footer-column">
            <h2>API 分类</h2>
            ${categories.map((category) => `<a href="${pageUrl(root, `categories/${category.id}/`)}">${escapeHtml(category.name)}</a>`).join("")}
          </div>
          <div class="footer-column">
            <h2>索引与说明</h2>
            <a href="${pageUrl(root, "providers/")}">全部厂商</a>
            <a href="${pageUrl(root, "about/")}">收录方法</a>
            <a href="${pageUrl(root, "about/#pricing")}">价格口径</a>
            <a href="#top">回到顶部 ↑</a>
          </div>
          <div class="footer-column">
            <h2>数据口径</h2>
            <span>官方公开标价</span>
            <span>保留原计价单位</span>
            <span>不含联盟链接</span>
            <span>更新于 ${formatDate(site.updatedAt)}</span>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${year} Model Atlas。非官方资料站，厂商名称与商标归各自所有者。</p>
        <p>价格可能随时调整，购买或上线前请以厂商官网为准。</p>
      </div>
    </div>
  </footer>`;
}

function searchDialog(root) {
  return `<dialog class="search-dialog" id="search-dialog" aria-labelledby="search-title">
    <div class="search-shell">
      <div class="search-bar">
        <span class="search-bar__icon">${icon("search")}</span>
        <label class="sr-only" for="site-search">搜索厂商、模型或类别</label>
        <input id="site-search" type="search" name="q" placeholder="搜索厂商、模型或类别…" autocomplete="off" spellcheck="false" aria-describedby="search-status">
        <button class="search-close" type="button" data-search-close aria-label="关闭搜索">
          <span>ESC</span>${icon("close")}
        </button>
      </div>
      <h2 class="sr-only" id="search-title">全站搜索</h2>
      <p class="search-status" id="search-status" aria-live="polite">输入关键字，查找厂商、型号或 API 类别。</p>
      <div class="search-results" id="search-results"></div>
      <div class="search-help">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>↵</kbd> 打开</span>
        <span><kbd>esc</kbd> 关闭</span>
      </div>
    </div>
  </dialog>`;
}

// The 404 page is served at an arbitrary missing URL, so neither root-absolute
// nor plain relative links can point back at the site reliably. The page ships
// without external assets and this probe locates the deployment mount by
// walking up the path until the site's favicon resolves, then rewrites every
// internal link relative to it.
function notFoundProbeScript() {
  return `<script>
(function () {
  var samePage = { "#top": 1, "#main": 1 };
  function apply(prefix) {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (!href || href.indexOf("//") === 0 || /^(https?:|mailto:|tel:)/i.test(href)) continue;
      if (href.charAt(0) === "#") {
        if (samePage[href.toLowerCase()]) continue;
        links[i].setAttribute("href", prefix + "index.html" + href);
      } else {
        links[i].setAttribute("href", prefix + href);
      }
    }
  }
  var base = location.pathname;
  if (base.charAt(base.length - 1) !== "/") base = base.slice(0, base.lastIndexOf("/") + 1);
  var candidates = [""];
  var prefix = "";
  var depth = base.split("/").filter(Boolean).length + 1;
  for (var i = 0; i < depth; i++) {
    prefix += "../";
    candidates.push(prefix);
  }
  var index = 0;
  (function next() {
    if (index >= candidates.length) return;
    var candidate = candidates[index++];
    fetch(candidate + "assets/favicon.svg")
      .then(function (response) {
        if (response.ok) apply(candidate);
        else next();
      })
      .catch(next);
  })();
})();
</script>`;
}

export function renderLayout({ title, description, root, current, content, site, categories, bodyClass = "", notFound = false, inlineCss = "" }) {
  const fullTitle = title === site.brand.name ? `${site.brand.name} — ${site.brand.nameZh}` : `${title} — Model Atlas`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="theme-color" content="#0d0d10">
  <meta name="color-scheme" content="dark">
  <meta property="og:title" content="${escapeAttr(fullTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  ${notFound ? `<style>${inlineCss}</style>` : `<link rel="icon" href="${pageUrl(root, "assets/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${pageUrl(root, "assets/styles.css")}">`}
  <script>document.documentElement.classList.add('js');</script>
</head>
<body id="top" class="${escapeAttr(bodyClass)}" data-root="${escapeAttr(root)}">
  <a class="skip-link" href="#main">跳到主要内容</a>
  ${header(site, categories, root, current, notFound)}
  <main id="main">
    ${content}
  </main>
  ${footer(site, categories, root)}
  ${notFound ? "" : searchDialog(root)}
  ${notFound ? "" : `<div class="copy-toast" id="copy-toast" role="status" aria-live="polite"></div>
  <script src="${pageUrl(root, "assets/search-index.js")}" defer></script>
  <script src="${pageUrl(root, "assets/app.js")}" defer></script>`}
  ${notFound ? notFoundProbeScript() : ""}
</body>
</html>`;
}
