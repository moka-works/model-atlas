import { escapeAttr, escapeHtml, formatDate, modelInCategory } from "./lib.mjs";
import { icon } from "./icons.mjs";
import {
  breadcrumb,
  categoryTag,
  externalLink,
  pageUrl,
  providerMark,
  providerRow,
  sectionHead,
} from "./layout.mjs";

const pad = (value) => String(value).padStart(2, "0");

function providerGroups(providers) {
  return [
    {
      id: "cn",
      title: "中国厂商",
      items: providers.filter((provider) => provider.isChina),
    },
    {
      id: "intl",
      title: "海外厂商",
      items: providers.filter((provider) => !provider.isChina),
    },
  ].filter((group) => group.items.length);
}

function vendorGroupMarkup(group, root, extraAttrs = () => "") {
  return `<section class="vendor-group" data-vendor-group>
    <header class="vendor-group__head">
      <h2>${escapeHtml(group.title)}</h2>
      <span>${group.items.length} 家</span>
    </header>
    <div class="vendor-rows">
      ${group.items.map((provider) => providerRow(provider, root, extraAttrs(provider))).join("")}
    </div>
  </section>`;
}

function linkButton(href, label, variant = "primary", extra = "") {
  return `<a class="button button--${variant}" href="${escapeAttr(href)}"${extra ? ` ${extra}` : ""}>${label}${icon("arrowRight", "button-icon")}</a>`;
}

function categoryCard(category, root, featured = false) {
  const marks = category.providers.slice(0, 4);
  const overflow = category.providerCount - marks.length;
  return `<a class="category-card${featured ? " category-card--ink" : ""}" href="${pageUrl(root, `categories/${category.id}/`)}" style="--cat:${escapeAttr(category.color)};--cat-soft:${escapeAttr(category.soft)}">
    <div class="category-card__top">
      <span class="category-card__number">${escapeHtml(category.number)}</span>
      <span class="category-card__icon">${icon(category.icon)}</span>
    </div>
    <div class="category-card__body">
      <span class="category-card__en">${escapeHtml(category.enName)}</span>
      <h3>${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.summary)}</p>
    </div>
    <div class="category-card__bottom">
      <div class="category-card__providers" aria-label="收录厂商">
        ${marks.map((provider) => providerMark(provider, "xs")).join("")}
        ${overflow > 0 ? `<span class="vendor-mark-more">+${overflow}</span>` : ""}
      </div>
      <span class="category-card__count">${category.providerCount} 家厂商 / ${category.modelCount} 个型号</span>
    </div>
    <span class="category-card__go">进入分类 ${icon("arrowRight")}</span>
  </a>`;
}

function snapshotPanel(site, stats, root) {
  return `<aside class="snapshot" aria-label="收录数据快照">
    <div class="snapshot__top">
      <span>INDEX / SNAPSHOT</span>
      <span>${escapeHtml(formatDate(site.updatedAt))}</span>
    </div>
    <div class="snapshot__stats">
      <div><strong>${stats.providerCount}</strong><span>厂商</span></div>
      <div><strong>${stats.chinaProviderCount}</strong><span>中国厂商</span></div>
      <div><strong>${stats.modelCount}</strong><span>型号</span></div>
      <div><strong>${stats.categoryCount}</strong><span>类别</span></div>
    </div>
    <div class="snapshot__rule"><span></span><span>CATEGORY LEDGER</span></div>
    <ul class="snapshot__categories">
      ${stats.categories
        .map(
          (category) => `<li><a href="${pageUrl(root, `categories/${category.id}/`)}" style="--cat:${escapeAttr(category.color)}">
            <span class="snapshot__dot"></span>
            <span class="snapshot__name">${escapeHtml(category.name)}</span>
            <span class="snapshot__count">${category.providerCount} 家 / ${category.modelCount} 型号</span>
            ${icon("arrowUpRight")}
          </a></li>`,
        )
        .join("")}
    </ul>
    <div class="snapshot__footer">
      <span class="verified-badge"><span></span>官网定价</span>
      <span>以厂商最新页面为准</span>
    </div>
    <span class="snapshot__stamp" aria-hidden="true">CHECKED<br>${escapeHtml(formatDate(site.updatedAt).slice(5))}</span>
  </aside>`;
}

function pickCard(pick, root) {
  const { provider, model, categoryMeta } = pick;
  const eyebrow = pick.eyebrow || `${categoryMeta.enName} / EDITOR'S PICK`;
  return `<a class="pick-card" href="${pageUrl(root, `providers/${provider.slug}/`)}#${model.anchor}" style="--cat:${escapeAttr(categoryMeta.color)};--cat-soft:${escapeAttr(categoryMeta.soft)}">
    <div class="pick-card__top">
      <span>${escapeHtml(eyebrow)}</span>
      ${providerMark(provider, "sm")}
    </div>
    <div class="pick-card__title">
      <span>${escapeHtml(provider.name)}</span>
      <h3>${escapeHtml(model.name)}</h3>
    </div>
    <p>${escapeHtml(pick.reason)}</p>
    <div class="pick-card__bottom">
      <span class="pick-card__price">${escapeHtml(model.price.primary)}<small>${escapeHtml(model.price.unit || "")}</small></span>
      ${icon("arrowRight")}
    </div>
  </a>`;
}

export function renderHome(data, root) {
  const { site, stats, categoriesWithStats: categories, editorPicks, providers } = data;
  const hasPicks = editorPicks.length > 0;
  const groups = providerGroups(providers);
  const sections = {
    categories: "01",
    picks: hasPicks ? "02" : null,
    vendors: hasPicks ? "03" : "02",
  };

  return `<div class="home">
    <section class="hero">
      <div class="container hero__grid">
        <div class="hero__copy">
          <p class="eyebrow hero__kicker"><span class="pulse-dot"></span>${escapeHtml(site.hero.kicker)}<span class="hero__edition">${escapeHtml(site.edition)}</span></p>
          <h1 class="hero__title"><span>${escapeHtml(site.hero.titleTop)}</span><span>${escapeHtml(site.hero.titleBottom)}<em>。</em></span></h1>
          <p class="hero__lede">${escapeHtml(site.hero.lede)}</p>
          <div class="hero__actions">
            ${linkButton("#categories", "按类别浏览")}
            <a class="button button--quiet" href="${pageUrl(root, "providers/")}">打开厂商索引 ${icon("arrowUpRight", "button-icon")}</a>
          </div>
          <p class="hero__note">${icon("check")} ${escapeHtml(site.hero.note)}</p>
          <dl class="hero__meta">
            <div><dt>中国厂商</dt><dd>${stats.chinaProviderCount}</dd></div>
            <div><dt>海外厂商</dt><dd>${stats.intlProviderCount}</dd></div>
            <div><dt>代表型号</dt><dd>${stats.modelCount}</dd></div>
            <div><dt>数据核对</dt><dd>${escapeHtml(formatDate(site.updatedAt))}</dd></div>
          </dl>
        </div>
        ${snapshotPanel(site, stats, root)}
      </div>
    </section>

    <section class="section" id="categories">
      <div class="container">
        ${sectionHead({
          index: sections.categories,
          eyebrow: "CATEGORY INDEX",
          title: "按 API 类别进入",
          copy: "先确定任务，再看厂商与价格。每个类别直接列出型号、官方价和关键规格。",
          action: `<span class="section-head__stamp">${stats.categoryCount} 类 · ${stats.providerCount} 家 · ${stats.modelCount} 型号</span>`,
        })}
        <div class="category-grid">
          ${categories.map((category) => categoryCard(category, root, category.id === "text")).join("")}
        </div>
        <p class="section-footnote">${icon("info")} 同一个厂商可能出现在多个类别中；分类按模型的“主要用途”划分，不代表它只具备这一种能力。</p>
      </div>
    </section>

    ${
      hasPicks
        ? `<section class="section picks-section">
      <div class="container">
        ${sectionHead({
          index: sections.picks,
          eyebrow: "LOW-FRICTION STARTS",
          title: "三个中国模型起点",
          copy: "从当前收录里挑出适合先做原型、再逐步放大的中国模型；不是排行榜，也不替代你自己的样本测试。",
        })}
        <div class="picks-grid">
          ${editorPicks.map((pick) => pickCard(pick, root)).join("")}
        </div>
        <p class="section-footnote">${icon("info")} 精选只基于公开价格与 API 形态，不代表实测效果排名；请用自己的任务样本复核。</p>
      </div>
    </section>`
        : ""
    }

    <section class="section vendor-section">
      <div class="container">
        ${sectionHead({
          index: sections.vendors,
          eyebrow: "VENDOR DIRECTORY",
          title: "厂商速览",
          copy: site.directoryNote,
          action: `<a class="text-link" href="${pageUrl(root, "providers/")}">全部 ${stats.providerCount} 家厂商 ${icon("arrowRight")}</a>`,
        })}
        ${groups.map((group) => vendorGroupMarkup(group, root)).join("")}
        <div class="directory-cta">
          <p>共 ${stats.providerCount} 家厂商、${stats.modelCount} 个代表型号；本站只收录模型信息，不提供 API 服务。</p>
          ${linkButton(pageUrl(root, "providers/"), "进入厂商索引", "outline")}
        </div>
      </div>
    </section>

    <section class="closing">
      <div class="container closing__inner">
        <div class="closing__headline">
          <p class="eyebrow">THE FINE PRINT MATTERS</p>
          <h2>价格只是故事的一半。<br><span>能力边界才是另一半。</span></h2>
        </div>
        <div class="closing__copy">
          <p>同一个价位，上下文、并发、延迟、内容限制和失败计费可以完全不同。图鉴把官网上的细节摊开，但不替你做最终决定。</p>
          <a class="text-link text-link--light" href="${pageUrl(root, "about/")}">阅读收录与定价方法 ${icon("arrowRight")}</a>
        </div>
        <span class="closing__glyph" aria-hidden="true">${icon("mark")}</span>
      </div>
    </section>
  </div>`;
}

function guideTip(tip, index) {
  return `<article class="guide-tip">
    <span class="guide-tip__number">${pad(index + 1)}</span>
    <h3>${escapeHtml(tip.title)}</h3>
    <p>${escapeHtml(tip.text)}</p>
  </article>`;
}

function categoryModelGroups(category) {
  const groups = [];
  for (const model of category.models) {
    let group = groups[groups.length - 1];
    if (!group || group.provider.slug !== model.provider.slug) {
      group = { provider: model.provider, models: [] };
      groups.push(group);
    }
    group.models.push(model);
  }
  return groups;
}

function modelSpecChips(model, limit = 3) {
  const specs = (model.specs || []).slice(0, limit);
  if (!specs.length) return '<span class="muted">—</span>';
  return `<span class="spec-chips">${specs
    .map(
      (spec) =>
        `<span><b>${escapeHtml(spec.label)}</b>${escapeHtml(spec.value)}</span>`,
    )
    .join("")}</span>`;
}

function categoryModelTable(category, root) {
  const groups = categoryModelGroups(category);
  return `<p class="table-hint">${icon("arrowRight")} 左右滑动查看官方价、关键规格与文档</p>
  <div class="table-scroll" role="region" tabindex="0" aria-label="${escapeAttr(category.name)}型号与官方价格对比">
    <table class="data-table">
      <caption class="sr-only">${escapeHtml(category.name)}模型官方价格对比</caption>
      <thead>
        <tr>
          <th scope="col">型号</th>
          <th scope="col">官方价</th>
          <th scope="col">关键规格</th>
          <th scope="col">文档</th>
        </tr>
      </thead>
      ${groups
        .map(
          (group) => `<tbody>
        <tr class="data-table__band">
          <th colspan="4" scope="rowgroup">
            <a class="data-table__provider" href="${pageUrl(root, `providers/${group.provider.slug}/`)}">
              ${providerMark(group.provider, "sm")}
              <span class="data-table__provider-name">
                <strong>${escapeHtml(group.provider.name)}</strong>
                ${group.provider.isChina ? '<span class="vendor-cn">中国</span>' : ""}
                <small>${escapeHtml(group.provider.country)} · ${group.models.length} 个型号</small>
              </span>
              <span class="data-table__provider-go">查看厂商 ${icon("arrowRight")}</span>
            </a>
          </th>
        </tr>
        ${group.models
          .map(
            (model) => `<tr>
          <td class="data-table__model">
            <span class="data-table__model-head">
              <a href="${pageUrl(root, `providers/${group.provider.slug}/`)}#${model.anchor}"><strong>${escapeHtml(model.name)}</strong></a>
              ${model.badge ? `<span class="model-badge">${escapeHtml(model.badge)}</span>` : ""}
            </span>
            <button class="model-id model-id--inline" type="button" data-copy="${escapeAttr(model.id)}" title="复制 API 型号 ID" aria-label="复制 ${escapeAttr(model.name)} 的 API 型号 ID：${escapeAttr(model.id)}">
              <code>${escapeHtml(model.id)}</code>
              ${icon("copy", "model-id__copy")}
              ${icon("check", "model-id__check")}
            </button>
          </td>
          <td class="data-table__price">
            <strong>${escapeHtml(model.price.primary)}</strong>
            <span>${escapeHtml(model.price.unit || "")}</span>
            ${model.price.detail ? `<small>${escapeHtml(model.price.detail)}</small>` : ""}
            ${model.price.note ? `<small class="is-warn">${escapeHtml(model.price.note)}</small>` : ""}
          </td>
          <td class="data-table__specs">${modelSpecChips(model)}</td>
          <td class="data-table__doc">${model.docsUrl ? externalLink(model.docsUrl, "文档", "table-doc") : '<span class="muted">—</span>'}</td>
        </tr>`,
          )
          .join("")}
      </tbody>`,
        )
        .join("")}
    </table>
  </div>`;
}

export function renderCategoryPage(data, category, root) {
  const { site, categoriesWithStats } = data;
  const otherCategories = categoriesWithStats.filter((item) => item.id !== category.id);
  const sectionIndex = category.number;

  return `<div class="category-page" style="--cat:${escapeAttr(category.color)};--cat-soft:${escapeAttr(category.soft)}">
    <section class="category-hero">
      <div class="container">
        ${breadcrumb([{ label: "分类", href: `${root}#categories` }, { label: category.name }], root)}
        <div class="category-hero__grid">
          <div class="category-hero__copy">
            <p class="eyebrow"><span class="category-hero__swatch"></span>CATEGORY ${escapeHtml(category.number)} / ${escapeHtml(category.enName)}</p>
            <div class="category-hero__title-row">
              <span class="category-hero__icon">${icon(category.icon)}</span>
              <h1>${escapeHtml(category.name)}<em>。</em></h1>
            </div>
            <p class="category-hero__lede">${escapeHtml(category.summary)}</p>
          </div>
          <aside class="category-stat-card">
            <div class="category-stat-card__stats">
              <div><strong>${category.providerCount}</strong><span>家厂商</span></div>
              <div><strong>${category.modelCount}</strong><span>个代表型号</span></div>
            </div>
            <div class="category-stat-card__note">
              <span>计价口径</span>
              <p>${escapeHtml(category.priceNote)}</p>
            </div>
            <span class="category-stat-card__index" aria-hidden="true">${escapeHtml(category.number)}</span>
          </aside>
        </div>
      </div>
      <span class="category-hero__watermark" aria-hidden="true">${icon(category.icon)}</span>
    </section>

    <section class="section category-notes">
      <div class="container">
        ${sectionHead({
          index: sectionIndex,
          eyebrow: "BUYER'S NOTES",
          title: "这一类，先看什么",
          copy: category.description,
        })}
        <div class="guide-grid">
          ${category.buyerTips.map(guideTip).join("")}
        </div>
        <aside class="price-rule">
          <span class="price-rule__label">${icon("info")} 计价提示</span>
          <p>${escapeHtml(category.priceNote)}</p>
          <span class="price-rule__date">核对于 ${escapeHtml(formatDate(site.updatedAt))}</span>
        </aside>
      </div>
    </section>

    <section class="section category-providers">
      <div class="container">
        <header class="provider-list-head">
          <div>
            <p class="eyebrow">MODEL PRICE TABLE / ${pad(category.modelCount)}</p>
            <h2>型号与官方价格</h2>
          </div>
          <p>点击型号可进入厂商页查看完整能力、限制与计费说明；本站只收录模型信息，不提供 API 服务。</p>
        </header>
        ${categoryModelTable(category, root)}
        <div class="category-endcap">
          <a class="text-link" href="${pageUrl(root, "providers/")}">查看全部厂商 ${icon("arrowRight")}</a>
          <span>价格已核对至 ${escapeHtml(formatDate(site.updatedAt))} · 以官网为准</span>
        </div>
      </div>
    </section>

    <section class="next-categories">
      <div class="container">
        <p class="eyebrow">KEEP EXPLORING</p>
        <h2>换一个模态看看</h2>
        <div class="next-categories__grid">
          ${otherCategories
            .map(
              (item) => `<a class="next-category" href="${pageUrl(root, `categories/${item.id}/`)}" style="--cat:${escapeAttr(item.color)};--cat-soft:${escapeAttr(item.soft)}">
                <span class="next-category__icon">${icon(item.icon)}</span>
                <span><strong>${escapeHtml(item.name)}</strong><small>${item.providerCount} 家厂商 / ${item.modelCount} 个型号</small></span>
                ${icon("arrowRight")}
              </a>`,
            )
            .join("")}
        </div>
      </div>
    </section>
  </div>`;
}

function providerFilterAttrs(provider) {
  const search = escapeAttr(
    [
      provider.name,
      provider.englishName || "",
      provider.country,
      provider.headquarters,
      ...provider.categories.map((category) => category.name),
      ...provider.models.flatMap((model) => [model.name, model.id, ...(model.tags || [])]),
    ]
      .join(" ")
      .toLowerCase(),
  );
  return ` data-vendor-card data-categories="${escapeAttr(provider.categories.map((category) => category.id).join(" "))}" data-search="${search}"`;
}

export function renderProvidersPage(data, root) {
  const { site, stats, categoriesWithStats, providers } = data;
  const groups = providerGroups(providers);
  return `<div class="providers-page">
    <section class="directory-hero">
      <div class="container">
        ${breadcrumb([{ label: "厂商" }], root)}
        <div class="directory-hero__grid">
          <div>
            <p class="eyebrow">THE VENDOR DIRECTORY</p>
            <h1>厂商索引<em>。</em></h1>
            <p class="directory-hero__lede">${escapeHtml(site.directoryNote)}</p>
          </div>
          <dl class="directory-hero__stats">
            <div><dt>PROVIDERS</dt><dd>${stats.providerCount}</dd><span>家厂商</span></div>
            <div><dt>CHINA</dt><dd>${stats.chinaProviderCount}</dd><span>家中国厂商</span></div>
            <div><dt>MODELS</dt><dd>${stats.modelCount}</dd><span>个代表型号</span></div>
            <div><dt>VERIFIED</dt><dd>${escapeHtml(formatDate(site.updatedAt))}</dd><span>最近核对</span></div>
          </dl>
        </div>
      </div>
    </section>

    <section class="directory-body">
      <div class="container">
        <div class="filter-panel" data-filter-panel>
          <div class="filter-top">
            <label class="filter-search" for="vendor-filter">
              ${icon("search")}
              <input id="vendor-filter" type="search" placeholder="搜索厂商、型号或能力…" autocomplete="off" spellcheck="false">
              <button class="filter-clear" type="button" data-filter-clear aria-label="清空搜索" hidden>${icon("close")}</button>
            </label>
            <p class="filter-count" id="vendor-filter-count" aria-live="polite">显示 ${stats.providerCount} 家厂商</p>
          </div>
          <div class="filter-chips" role="group" aria-label="按 API 类别筛选">
            <button class="filter-chip is-active" type="button" data-filter-category="all">全部<span>${stats.providerCount}</span></button>
            ${categoriesWithStats
              .map(
                (category) => `<button class="filter-chip" type="button" data-filter-category="${escapeAttr(category.id)}" style="--cat:${escapeAttr(category.color)}">${escapeHtml(category.name)}<span>${category.providerCount}</span></button>`,
              )
              .join("")}
          </div>
        </div>
        <noscript><p class="noscript-note">筛选功能需要 JavaScript；当前已展示全部厂商。</p></noscript>
        <div class="vendor-groups" data-vendor-grid>
          ${groups.map((group) => vendorGroupMarkup(group, root, providerFilterAttrs)).join("")}
        </div>
        <div class="empty-state" data-vendor-empty hidden>
          ${icon("search")}
          <h2>没有匹配的厂商</h2>
          <p>换个关键词，或清除类别筛选再试一次。</p>
          <button class="button button--outline" type="button" data-filter-reset>重置筛选</button>
        </div>
        <div class="directory-foot">
          <p>${icon("info")} 价格按厂商官网公开页面整理，具体规格与可用性可能因账号、地区或合同条款不同。最后核对：${escapeHtml(formatDate(site.updatedAt))}。</p>
          <a class="text-link" href="${pageUrl(root, "about/#pricing")}">了解价格口径 ${icon("arrowRight")}</a>
        </div>
      </div>
    </section>
  </div>`;
}

function modelPrice(model) {
  const { price } = model;
  return `<div class="model-price">
    <span class="model-price__label">官方公开价</span>
    <p class="model-price__value"><strong>${escapeHtml(price.primary)}</strong><span>${escapeHtml(price.unit || "")}</span></p>
    ${price.detail ? `<p class="model-price__detail">${escapeHtml(price.detail)}</p>` : ""}
    ${price.note ? `<p class="model-price__note">${escapeHtml(price.note)}</p>` : ""}
  </div>`;
}

function modelCard(model, provider, root) {
  return `<article class="model-card" id="${model.anchor}">
    <div class="model-card__main">
      <div class="model-card__heading">
        <h3>${escapeHtml(model.name)}</h3>
        ${model.badge ? `<span class="model-badge">${escapeHtml(model.badge)}</span>` : ""}
      </div>
      <button class="model-id" type="button" data-copy="${escapeAttr(model.id)}" title="复制 API 型号 ID" aria-label="复制 ${escapeAttr(model.name)} 的 API 型号 ID：${escapeAttr(model.id)}">
        <code>${escapeHtml(model.id)}</code>
        ${icon("copy", "model-id__copy")}
        ${icon("check", "model-id__check")}
      </button>
      ${
        model.specs?.length
          ? `<dl class="model-specs">${model.specs
              .map((spec) => `<div><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd></div>`)
              .join("")}</dl>`
          : ""
      }
      <p class="model-card__description">${escapeHtml(model.description)}</p>
      <div class="model-card__tags">
        ${(model.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${
        model.docsUrl
          ? externalLink(model.docsUrl, "查看型号文档", "model-card__doc")
          : ""
      }
    </div>
    ${modelPrice(model)}
  </article>`;
}

function modelGroup(category, models, provider, root) {
  return `<section class="model-group" aria-labelledby="models-${category.id}">
    <header class="model-group__head" id="models-${category.id}">
      <span class="model-group__icon" style="--cat:${escapeAttr(category.color)};--cat-soft:${escapeAttr(category.soft)}">${icon(category.icon)}</span>
      <div>
        <p class="eyebrow">${escapeHtml(category.enName)}</p>
        <h2>${escapeHtml(category.name)}</h2>
      </div>
      <span class="model-group__count">${models.length} 个型号</span>
    </header>
    <div class="model-list">
      ${models.map((model) => modelCard(model, provider, root)).join("")}
    </div>
  </section>`;
}

export function renderProviderPage(data, provider, root) {
  const { site, providers, categoriesWithStats } = data;
  const grouped = categoriesWithStats
    .map((category) => ({
      category,
      models: provider.models.filter((model) => model.category === category.id),
    }))
    .filter((group) => group.models.length > 0);

  const related = providers
    .filter((item) => item.slug !== provider.slug)
    .map((item) => {
      const shared = item.categories.filter((category) => provider.categories.some((own) => own.id === category.id));
      const sharedModels = item.models.filter((model) =>
        shared.some((category) => modelInCategory(model, category.id)),
      ).length;
      return { provider: item, shared, sharedModels };
    })
    .filter((item) => item.shared.length > 0)
    .sort(
      (a, b) =>
        b.shared.length - a.shared.length ||
        b.sharedModels - a.sharedModels ||
        a.provider.order - b.provider.order,
    )
    .slice(0, 3);

  const sources = provider.sources?.length
    ? provider.sources
    : [
        { label: "官方定价页", url: provider.pricingUrl },
        { label: "API 文档", url: provider.docsUrl },
      ].filter((source) => source.url);

  return `<div class="provider-page" style="--vendor:${escapeAttr(provider.color)}">
    <div class="container">
      ${breadcrumb(
        [
          { label: "厂商", href: pageUrl(root, "providers/") },
          { label: provider.name },
        ],
        root,
      )}

      <header class="provider-hero">
        <div class="provider-hero__copy">
          <p class="eyebrow provider-hero__overline">PROVIDER FILE <span>/ ${escapeHtml(provider.country)}</span></p>
          <div class="provider-hero__name">
            ${providerMark(provider, "xl")}
            <h1>${escapeHtml(provider.name)}</h1>
          </div>
          <p class="provider-hero__lede">${escapeHtml(provider.summary)}</p>
          <div class="provider-hero__categories">
            ${provider.categories.map((category) => categoryTag(category, { href: pageUrl(root, `categories/${category.id}/`) })).join("")}
          </div>
        </div>
        <aside class="provider-facts" aria-label="厂商基本信息">
          <div class="provider-facts__head">
            <span>QUICK FACTS</span>
            <span class="verified-badge"><span></span>已核对</span>
          </div>
          <dl class="fact-list">
            <div><dt>总部</dt><dd>${escapeHtml(provider.headquarters || provider.country)}</dd></div>
            <div><dt>收录型号</dt><dd>${provider.modelCount} 个</dd></div>
            <div><dt>API 形态</dt><dd>${escapeHtml((provider.apiStyles || []).join(" / "))}</dd></div>
            <div><dt>免费额度</dt><dd>${escapeHtml(provider.freeTier || "以官网为准")}</dd></div>
          </dl>
          <div class="provider-facts__links">
            ${externalLink(provider.website, "官方网站")}
            ${externalLink(provider.docsUrl, "API 文档")}
            ${externalLink(provider.pricingUrl, "官方定价")}
          </div>
          <p class="provider-facts__date">价格核对于 ${escapeHtml(formatDate(site.updatedAt))}</p>
        </aside>
      </header>

      <div class="provider-meta-strip" aria-label="页面概览">
        <div><span>MODEL FILES</span><strong>${String(provider.modelCount).padStart(2, "0")}</strong><small>个型号</small></div>
        <div><span>CATEGORIES</span><strong>${String(provider.categories.length).padStart(2, "0")}</strong><small>个类别</small></div>
        <div><span>PRICE SOURCE</span><strong class="provider-meta-strip__text">公开定价页</strong><small>维护方官网</small></div>
        <div><span>LAST CHECKED</span><strong class="provider-meta-strip__text">${escapeHtml(formatDate(site.updatedAt))}</strong><small>以官网为准</small></div>
      </div>

      <section class="provider-editorial">
        <div class="provider-editorial__intro">
          <p class="eyebrow">CAPABILITY NOTES</p>
          <h2>这家厂商，<br>值得看什么。</h2>
          <p>${escapeHtml(provider.positioning || provider.summary)}</p>
        </div>
        <div class="highlight-list">
          ${(provider.highlights || [])
            .map(
              (highlight, index) => `<article class="highlight">
                <span>${pad(index + 1)}</span>
                <h3>${escapeHtml(highlight.title)}</h3>
                <p>${escapeHtml(highlight.text)}</p>
              </article>`,
            )
            .join("")}
        </div>
      </section>

      <div class="fit-grid">
        <article class="fit-card fit-card--good">
          <p class="eyebrow">BEST FOR</p>
          <h2>适合这样的团队</h2>
          <p>${escapeHtml(provider.fitFor)}</p>
        </article>
        <article class="fit-card fit-card--careful">
          <p class="eyebrow">WATCH OUTS</p>
          <h2>决定前，先确认</h2>
          <ul>
            ${(provider.watchOuts || []).map((item) => `<li>${icon("dot")}<span>${escapeHtml(item)}</span></li>`).join("")}
          </ul>
        </article>
      </div>

      <div class="provider-content-grid">
        <div class="provider-models">
          <header class="provider-models__head">
            <div>
              <p class="eyebrow">MODEL CATALOG / ${pad(provider.modelCount)}</p>
              <h2>型号与官方价格</h2>
            </div>
            <p>型号名称可点击复制；价格来自官方公开页面，实际账单以你的使用量与合同为准。</p>
          </header>
          ${grouped.map(({ category, models }) => modelGroup(category, models, provider, root)).join("")}
          <p class="catalog-note">${icon("info")} ${escapeHtml(provider.pricingNote || "页面仅选取代表型号，完整型号列表与最新价格请以官方文档为准。")}</p>
        </div>

        <aside class="provider-side">
          <div class="side-card">
            <p class="eyebrow">ON THIS PAGE</p>
            <nav class="side-nav" aria-label="本页目录">
              ${grouped
                .map(
                  ({ category, models }) =>
                    `<a href="#models-${category.id}" style="--cat:${escapeAttr(category.color)}"><span>${escapeHtml(category.name)}</span><small>${models.length}</small></a>`,
                )
                .join("")}
            </nav>
            <div class="side-rule"></div>
            <p class="side-note">同一厂商可能在不同类别中提供不同 API；计价单位与失败计费规则并不一致。</p>
          </div>
          <div class="side-card side-card--ink">
            <p class="eyebrow">OFFICIAL DOORS</p>
            <h2>去官网核对</h2>
            <p>型号更迭与价格变化频繁，上线前请以厂商官方页面和合同条款为最终依据。</p>
            <div class="side-links">
              ${externalLink(provider.pricingUrl, "查看官方定价")}
              ${externalLink(provider.docsUrl, "打开 API 文档")}
            </div>
          </div>
        </aside>
      </div>

      <section class="provider-sources">
        <div>
          <p class="eyebrow">SOURCES & CAVEATS</p>
          <h2>数据来源与口径</h2>
          <p>以下页面用于核对型号、能力与公开价格，访问于 ${escapeHtml(formatDate(site.updatedAt))}。不同地区、账号等级与合同可能适用不同价格。</p>
        </div>
        <ul>
          ${sources.map((source) => `<li>${externalLink(source.url, source.label)}</li>`).join("")}
        </ul>
      </section>

      <section class="related">
        <header class="related__head">
          <div><p class="eyebrow">ALSO CONSIDER</p><h2>同类厂商</h2></div>
          <a class="text-link" href="${pageUrl(root, "providers/")}">全部厂商 ${icon("arrowRight")}</a>
        </header>
        <div class="related-grid">
          ${related
            .map(
              ({ provider: item, shared }) => `<a class="related-card" href="${pageUrl(root, `providers/${item.slug}/`)}" style="--vendor:${escapeAttr(item.color)}">
                ${providerMark(item, "sm")}
                <span class="related-card__copy"><strong>${escapeHtml(item.name)}</strong><small>${shared.map((category) => escapeHtml(category.name)).join(" · ")}</small></span>
                <span class="related-card__count">${item.modelCount} 型号</span>
                ${icon("arrowUpRight")}
              </a>`,
            )
            .join("")}
        </div>
      </section>
    </div>
  </div>`;
}

export function renderAboutPage(data, root) {
  const { site, stats } = data;
  const about = site.about;
  return `<div class="about-page">
    <section class="about-hero">
      <div class="container">
        ${breadcrumb([{ label: "关于" }], root)}
        <p class="eyebrow">ABOUT / METHODOLOGY</p>
        <h1>${escapeHtml(about.title)}<em>。</em></h1>
        <div class="about-hero__bottom">
          <p>${escapeHtml(about.lede)}</p>
          <dl>
            <div><dt>收录厂商</dt><dd>${stats.providerCount}</dd></div>
            <div><dt>代表型号</dt><dd>${stats.modelCount}</dd></div>
            <div><dt>最后核对</dt><dd>${escapeHtml(formatDate(site.updatedAt))}</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <div class="container about-layout">
      <aside class="about-toc">
        <p class="eyebrow">CONTENTS</p>
        <nav aria-label="本页目录">
          <a href="#principles"><span>01</span>编辑原则</a>
          <a href="#scope"><span>02</span>收录范围</a>
          <a href="#pricing"><span>03</span>价格口径</a>
          <a href="#updates"><span>04</span>更新与边界</a>
        </nav>
      </aside>
      <div class="about-content">
        <section class="about-section" id="principles">
          <div class="about-section__title"><span>01</span><h2>编辑原则</h2></div>
          <div class="principle-list">
            ${about.principles
              .map(
                (principle, index) => `<article class="principle">
                  <span>${pad(index + 1)}</span>
                  <div><h3>${escapeHtml(principle.title)}</h3><p>${escapeHtml(principle.text)}</p></div>
                </article>`,
              )
              .join("")}
          </div>
        </section>

        <section class="about-section" id="scope">
          <div class="about-section__title"><span>02</span><h2>收录范围</h2></div>
          <ul class="about-list">
            ${about.scope.map((item) => `<li>${icon("check")}<span>${escapeHtml(item)}</span></li>`).join("")}
          </ul>
          <div class="about-callout">
            <span>只做收录，不提供 API</span>
            <p>本站不代理、转售或转发任何厂商的 API，也不提供调用通道；同时它也不是实时价格 API，不适合作为账单系统或自动询价接口。价格变动以厂商官方页面为唯一准绳。</p>
          </div>
        </section>

        <section class="about-section" id="pricing">
          <div class="about-section__title"><span>03</span><h2>价格口径</h2></div>
          <ul class="about-list about-list--numbered">
            ${about.pricing.map((item, index) => `<li><span class="about-list__num">${pad(index + 1)}</span><span>${escapeHtml(item)}</span></li>`).join("")}
          </ul>
        </section>

        <section class="about-section" id="updates">
          <div class="about-section__title"><span>04</span><h2>更新与边界</h2></div>
          <div class="update-log">
            <div class="update-log__date">${escapeHtml(formatDate(site.updatedAt))}</div>
            <div>
              <h3>价格核对与 MiniMax 型号更新</h3>
              <p>收录 ${stats.providerCount} 家厂商、${stats.modelCount} 个代表型号，覆盖 ${stats.categoryCount} 类模型 API。新增 MiniMax-M3.1-Flash，并重新对照厂商官方页面核对价格。</p>
            </div>
          </div>
          <p class="about-endnote">模型 API 市场变化很快：型号会下线，价格会调整，限制也会随版本更新。图鉴能提供的是选型起点，不能替代你自己的评测、压测与商务确认。</p>
          <div class="about-cta">
            <h2>从厂商索引开始。</h2>
            ${linkButton(pageUrl(root, "providers/"), `浏览 ${stats.providerCount} 家厂商`, "outline")}
            <a class="text-link" href="${root}#categories">按类别浏览 ${icon("arrowRight")}</a>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

export function renderNotFoundPage(data, root) {
  return `<div class="not-found">
    <div class="container not-found__inner">
      <p class="eyebrow">ERROR / 404</p>
      <div class="not-found__number">404<span>。</span></div>
      <h1>这一页不在图鉴里。</h1>
      <p>链接可能已经更新，或型号页面被更名。回到索引继续找。</p>
      <div class="not-found__actions">
        ${linkButton(pageUrl(root, ""), "回到首页")}
        <a class="button button--quiet" href="${pageUrl(root, "providers/")}">浏览厂商索引 ${icon("arrowRight", "button-icon")}</a>
      </div>
    </div>
  </div>`;
}
