import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatDate, loadSiteData, prepareData } from "./lib.mjs";
import { renderLayout } from "./layout.mjs";
import {
  renderAboutPage,
  renderCategoryPage,
  renderHome,
  renderNotFoundPage,
  renderProviderPage,
  renderProvidersPage,
} from "./pages.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(projectRoot, "dist");
const assetsSrc = join(projectRoot, "src/assets");
const assetsDist = join(distDir, "assets");

function rootFor(filePath) {
  const depth = filePath.split("/").length - 1;
  return "../".repeat(depth);
}

function writePage(filePath, html) {
  const target = join(distDir, filePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, "utf8");
}

function validate(data) {
  const warnings = [];
  const providerSlugs = new Set();

  for (const provider of data.providers) {
    if (!provider.slug || !provider.name || !provider.summary) {
      throw new Error(`厂商数据缺少 slug/name/summary：${provider.name || "(未命名)"}`);
    }
    if (providerSlugs.has(provider.slug)) throw new Error(`重复的厂商 slug：${provider.slug}`);
    providerSlugs.add(provider.slug);
    if (!provider.models.length) warnings.push(`${provider.name} 没有收录型号`);
    for (const field of ["website", "docsUrl", "pricingUrl"]) {
      if (!provider[field]) warnings.push(`${provider.name} 缺少 ${field}`);
    }

    const modelIds = new Set();
    const anchors = new Set();
    for (const model of provider.models) {
      if (!model.name || !model.id || !model.description || !model.price?.primary) {
        throw new Error(`${provider.name} 的型号数据不完整：${model.name || model.id || "(未命名)"}`);
      }
      if (modelIds.has(model.id)) throw new Error(`${provider.name} 存在重复 model ID：${model.id}`);
      modelIds.add(model.id);
      if (anchors.has(model.anchor)) throw new Error(`${provider.name} 存在重复锚点：${model.anchor}`);
      anchors.add(model.anchor);
    }
  }

  for (const warning of warnings) console.warn(`  ! ${warning}`);
  return warnings;
}

function buildSearchIndex(data) {
  const entries = [];

  for (const category of data.categoriesWithStats) {
    entries.push({
      type: "category",
      title: category.name,
      meta: `${category.providerCount} 家厂商 · ${category.modelCount} 个型号`,
      href: `categories/${category.id}/`,
      keywords: [category.name, category.enName, category.summary, category.description].join(" "),
      accent: category.color,
      price: "",
    });
  }

  for (const provider of data.providers) {
    entries.push({
      type: "provider",
      title: provider.name,
      meta: `${provider.country} · ${provider.categories.map((category) => category.name).join(" / ")}`,
      href: `providers/${provider.slug}/`,
      keywords: [
        provider.name,
        provider.englishName || "",
        provider.country,
        provider.headquarters,
        provider.summary,
        ...provider.categories.map((category) => category.name),
        ...provider.models.flatMap((model) => [
          model.name,
          ...(model.alsoIn || []).map(
            (id) => data.categoriesWithStats.find((item) => item.id === id)?.name || "",
          ),
        ]),
      ].join(" "),
      accent: provider.color,
      price: `${provider.modelCount} 个型号`,
    });

    for (const model of provider.models) {
      entries.push({
        type: "model",
        title: model.name,
        meta: `${provider.name} · ${model.categoryMeta.name}`,
        href: `providers/${provider.slug}/#${model.anchor}`,
        keywords: [
          model.name,
          model.id,
          model.description,
          provider.name,
          model.categoryMeta.name,
          ...(model.alsoIn || []).map(
            (id) => data.categoriesWithStats.find((item) => item.id === id)?.name || "",
          ),
          ...(model.tags || []),
        ].join(" "),
        accent: model.categoryMeta.color,
        price: `${model.price.primary}${model.price.unit || ""}`,
      });
    }
  }

  return entries;
}

function build() {
  console.log("\n  Building Model Atlas…\n");
  const source = loadSiteData(projectRoot);
  const data = prepareData(source);
  validate(data);

  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  if (!existsSync(assetsSrc)) throw new Error("src/assets 不存在");
  cpSync(assetsSrc, assetsDist, { recursive: true });

  const { site, categories, stats, providers } = data;
  const common = { site, categories };

  const homePath = "index.html";
  writePage(
    homePath,
    renderLayout({
      ...common,
      title: site.brand.name,
      description: `${site.hero.lede} 收录 ${stats.providerCount} 家厂商、${stats.modelCount} 个代表型号，价格核对于 ${formatDate(site.updatedAt)}。`,
      root: rootFor(homePath),
      current: "",
      content: renderHome(data, rootFor(homePath)),
    }),
  );

  for (const category of data.categoriesWithStats) {
    const pagePath = `categories/${category.id}/index.html`;
    writePage(
      pagePath,
      renderLayout({
        ...common,
        title: `${category.name} API`,
        description: `${category.summary} 收录 ${category.providerCount} 家厂商、${category.modelCount} 个代表型号。`,
        root: rootFor(pagePath),
        current: "categories",
        content: renderCategoryPage(data, category, rootFor(pagePath)),
        bodyClass: "page-category",
      }),
    );
  }

  const providersPath = "providers/index.html";
  writePage(
    providersPath,
    renderLayout({
      ...common,
      title: "厂商索引",
      description: `按类别浏览 ${stats.providerCount} 家模型 API 厂商，比较 ${stats.modelCount} 个代表型号的能力与官方价格。`,
      root: rootFor(providersPath),
      current: "providers",
      content: renderProvidersPage(data, rootFor(providersPath)),
      bodyClass: "page-directory",
    }),
  );

  for (const provider of providers) {
    const pagePath = `providers/${provider.slug}/index.html`;
    writePage(
      pagePath,
      renderLayout({
        ...common,
        title: `${provider.name} API`,
        description: `${provider.name} 的模型 API 能力、型号与官方价格。${provider.summary}`,
        root: rootFor(pagePath),
        current: "providers",
        content: renderProviderPage(data, provider, rootFor(pagePath)),
        bodyClass: "page-provider",
      }),
    );
  }

  const aboutPath = "about/index.html";
  writePage(
    aboutPath,
    renderLayout({
      ...common,
      title: "收录与定价方法",
      description: site.about.lede,
      root: rootFor(aboutPath),
      current: "about",
      content: renderAboutPage(data, rootFor(aboutPath)),
      bodyClass: "page-about",
    }),
  );

  const notFoundPath = "404.html";
  // A 404 response keeps the requested URL at an unknown depth, so the page
  // inlines its stylesheet and its links carry path-only relative hrefs; an
  // embedded probe locates the deployment mount and rewrites them at runtime.
  const notFoundRoot = "";
  writePage(
    notFoundPath,
    renderLayout({
      ...common,
      title: "页面未找到",
      description: "这一页不在 Model Atlas 图鉴里。回到索引继续浏览模型 API。",
      root: notFoundRoot,
      current: "",
      content: renderNotFoundPage(data, notFoundRoot),
      bodyClass: "page-not-found",
      notFound: true,
      inlineCss: readFileSync(join(assetsSrc, "styles.css"), "utf8"),
    }),
  );

  const searchIndex = buildSearchIndex(data);
  const indexSource = `window.MODEL_ATLAS_SEARCH = ${JSON.stringify(searchIndex).replaceAll("<", "\\u003c")};\n`;
  writeFileSync(join(assetsDist, "search-index.js"), indexSource, "utf8");

  writeFileSync(
    join(distDir, "robots.txt"),
    "User-agent: *\nAllow: /\n",
    "utf8",
  );

  const pageCount = 4 + categories.length + providers.length;
  console.log(`  ✓ ${pageCount} pages`);
  console.log(`  ✓ ${stats.providerCount} providers / ${stats.modelCount} models / ${stats.categoryCount} categories`);
  console.log(`  ✓ ${searchIndex.length} search entries`);
  console.log(`  → dist/\n`);
}

build();
