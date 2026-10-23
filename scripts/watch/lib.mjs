import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const PRICE_FIELDS = ["input", "output", "cache"];

function roundPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(6));
}

function toPerMillion(value) {
  return roundPrice(Number(value) * 1_000_000);
}

export function canonical(value = "") {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
}

export function canonicalModel(value = "") {
  return canonical(String(value).split("/").pop());
}

export function hashSignal(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const cookieJar = new Map();

function cookieHeader(url) {
  const host = new URL(url).host;
  const cookies = cookieJar.get(host);
  if (!cookies?.size) return "";
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function storeCookies(url, response) {
  const host = new URL(url).host;
  const cookies = cookieJar.get(host) || new Map();
  for (const header of response.headers.getSetCookie?.() || []) {
    const pair = header.split(";")[0];
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  if (cookies.size) cookieJar.set(host, cookies);
}

export async function fetchText(url, config, attempt = 0) {
  const retries = config.retries ?? 0;
  try {
    const cookie = cookieHeader(url);
    const response = await fetch(url, {
      headers: {
        "user-agent": config.userAgent || "ModelAtlasWatch/1.0",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        ...(cookie ? { cookie } : {}),
      },
      signal: AbortSignal.timeout(config.timeoutMs || 60000),
    });
    storeCookies(url, response);
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return body;
  } catch (error) {
    if (attempt < retries) {
      await delay(750 * (attempt + 1));
      return fetchText(url, config, attempt + 1);
    }
    throw error;
  }
}

export async function fetchJson(url, config) {
  const body = await fetchText(url, { ...config, accept: "application/json" });
  return JSON.parse(body);
}

export function htmlToText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]).slice(0, 160) : "";
}

const STOPWORD_SPLIT = /[-_.]+/;
const FILE_EXTENSION = /\.(?:png|jpe?g|svg|webp|gif|css|js|mjs|html?|json|md|pdf)$/i;

export function compilePatterns(patterns = []) {
  return patterns.map((pattern) => {
    try {
      return new RegExp(pattern, "gi");
    } catch (error) {
      throw new Error(`无效的型号正则 ${pattern}: ${error.message}`);
    }
  });
}

export function extractModels(html, patterns, knownIds, excludeTerms) {
  const exclude = new Set(excludeTerms.map((term) => term.toLowerCase()));
  const found = new Set();

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of html.match(pattern) || []) {
      const token = match
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
      if (!token || token.length < 4 || token.length > 64) continue;
      if (FILE_EXTENSION.test(token)) continue;
      const segments = token.split(STOPWORD_SPLIT);
      if (segments.some((segment) => exclude.has(segment))) continue;
      if (!/\d/.test(token) && !knownIds.has(token)) continue;
      found.add(token);
    }
  }

  return [...found].sort().slice(0, 300);
}

const PRICE_PATTERN =
  /(?:[¥$€£]\s?\d+(?:[.,]\d+)?(?:\s?(?:\/|per)\s?[a-zA-Z]+)?|\d+(?:[.,]\d+)?\s?元|\d+(?:[.,]\d+)?\s?(?:units?|credits?|积分)\s?(?:\/|per)\s?[a-z\u4e00-\u9fff]+)/gi;

function normalizePriceToken(token) {
  const normalized = token.replace(/\s+/g, " ").replace(/,/g, ".").trim().toLowerCase();
  const match = normalized.match(/^([¥$€£])?\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return normalized;
  const [, symbol, number, suffix] = match;
  const amount = Number(number).toString();
  const unit = suffix.trim();
  if (symbol) return `${symbol}${amount}${unit ? (unit.startsWith("/") ? unit : ` ${unit}`) : ""}`;
  return `${amount}${unit.includes("元") ? " 元" : unit ? ` ${unit}` : ""}`;
}

export function extractPrices(html, limit = 400) {
  const found = new Set();
  for (const match of html.match(PRICE_PATTERN) || []) {
    found.add(normalizePriceToken(match));
    if (found.size >= limit) break;
  }
  return [...found].sort();
}

function isBlockedPage(status, html, title) {
  if (status >= 400) return `HTTP ${status}`;
  if (html.length < 500) return "页面内容过短";
  if (/just a moment|access denied|app unavailable in region|attention required|captcha/i.test(title)) {
    return `页面被拦截：${title}`;
  }
  return "";
}

export function officialPagesFor(provider, config) {
  const official = config.providers?.[provider.slug]?.official;
  if (!official || official.skip) return [];
  const pages = [];
  const add = (page) => {
    if (page.url && !pages.some((item) => item.url === page.url)) pages.push(page);
  };
  add({ label: "官方定价", url: provider.pricingUrl });
  for (const page of official.extraPages || []) add(page);
  return pages;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import("playwright").then(({ chromium }) => chromium.launch({ headless: true }));
  }
  return browserPromise;
}

export async function closeBrowser() {
  const promise = browserPromise;
  browserPromise = null;
  const browser = await promise?.catch(() => null);
  if (browser) await browser.close();
}

async function renderPage(url, config, pageConfig) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: config.userAgent || "ModelAtlasWatch/1.0",
    locale: "zh-CN",
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
  });

  try {
    await context.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs || 60000,
    });
    if (pageConfig.waitForSelector) {
      await page.waitForSelector(pageConfig.waitForSelector, { timeout: 15000 }).catch(() => {});
    }
    const waitMs = pageConfig.waitMs ?? 3000;
    if (waitMs) await page.waitForTimeout(waitMs);
    if (pageConfig.scroll !== false) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
    }
    return { status: response?.status() ?? 200, html: await page.content(), rendered: true };
  } finally {
    await context.close();
  }
}

export async function collectOfficialPage(provider, page, config, knownIds) {
  const official = config.providers?.[provider.slug]?.official || {};
  const patterns = compilePatterns(official.modelPatterns || []);
  const requestConfig = config.request || {};
  const useRender = page.render ?? official.render;
  let lastResult = null;
  let renderError = "";
  const attempts = official.attempts ?? 2;

  const loadPage = async () => {
    if (!useRender) return fetchTextResult(page.url, requestConfig);
    try {
      return await renderPage(page.url, requestConfig, { ...official, ...page });
    } catch (error) {
      renderError = error.message;
      return fetchTextResult(page.url, requestConfig);
    }
  };

  try {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const result = await loadPage();
      const title = extractTitle(result.html);
      const blocked = isBlockedPage(result.status, result.html, title);
      if (blocked) {
        return { ...page, ok: false, error: blocked, checkedAt: new Date().toISOString() };
      }

      const text = htmlToText(result.html);
      const modelSignal = page.modelSignal ?? official.modelSignal;
      const models =
        modelSignal === false ? [] : extractModels(result.html, patterns, knownIds, config.modelExcludeTerms || []);
      const prices = page.priceSignal === false ? [] : extractPrices(`${result.html}\n${text}`);
      lastResult = {
        ...page,
        ok: true,
        title,
        rendered: result.rendered === true,
        signal: hashSignal({ models, prices }),
        models,
        prices,
        contentLength: result.html.length,
        checkedAt: new Date().toISOString(),
      };
      if (models.length || prices.length) return lastResult;
      if (attempt < attempts - 1) await sleep(1200);
    }

    return {
      ...page,
      ok: false,
      error: `页面没有可识别的型号或价格信号（可能是前端渲染或访问受限）${renderError ? `；Playwright 渲染失败并回退 HTTP：${renderError}` : ""}`,
      checkedAt: new Date().toISOString(),
      contentLength: lastResult?.contentLength,
      title: lastResult?.title,
    };
  } catch (error) {
    return { ...page, ok: false, error: error.message, checkedAt: new Date().toISOString() };
  }
}

async function fetchTextResult(url, config, attempt = 0) {
  const retries = config.retries ?? 0;
  try {
    const cookie = cookieHeader(url);
    const response = await fetch(url, {
      headers: {
        "user-agent": config.userAgent || "ModelAtlasWatch/1.0",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        ...(cookie ? { cookie } : {}),
      },
      signal: AbortSignal.timeout(config.timeoutMs || 60000),
    });
    storeCookies(url, response);
    const html = await response.text();
    return { status: response.status, html };
  } catch (error) {
    if (attempt < retries) {
      await delay(750 * (attempt + 1));
      return fetchTextResult(url, config, attempt + 1);
    }
    throw error;
  }
}

function normalizeOpenRouter(data, providers, config) {
  const wanted = new Map();
  for (const provider of providers) {
    const prefixes = config.providers?.[provider.slug]?.aggregators?.openrouter || [];
    for (const prefix of prefixes) wanted.set(prefix, provider.slug);
  }

  const models = {};
  for (const item of data.data || []) {
    const [prefix, rest] = String(item.id || "").split("/");
    if (!wanted.has(prefix) || !rest) continue;
    const id = `${prefix}/${rest.split(":")[0]}`;
    if (id in models) continue;
    models[id] = {
      vendor: wanted.get(prefix),
      name: item.name || id,
      context: item.context_length ?? null,
      released: item.created ? new Date(item.created * 1000).toISOString().slice(0, 10) : null,
      price: {
        input: toPerMillion(item.pricing?.prompt),
        output: toPerMillion(item.pricing?.completion),
        cache: toPerMillion(item.pricing?.input_cache_read),
      },
    };
  }
  return models;
}

function normalizeModelsDev(data, providers, config) {
  const models = {};
  const seen = new Set();
  for (const provider of providers) {
    const providerIds = config.providers?.[provider.slug]?.aggregators?.modelsdev || [];
    const patterns = compilePatterns(config.providers?.[provider.slug]?.official?.modelPatterns || []);
    for (const providerId of providerIds) {
      const source = data[providerId];
      if (!source?.models) continue;
      for (const [modelId, model] of Object.entries(source.models)) {
        if (patterns.length && !patterns.some((pattern) => {
          pattern.lastIndex = 0;
          return pattern.test(modelId);
        })) continue;
        const canonicalId = canonicalModel(modelId);
        if (seen.has(canonicalId)) continue;
        seen.add(canonicalId);
        models[modelId] = {
          vendor: provider.slug,
          name: model.name || modelId,
          context: model.limit?.context ?? null,
          released: model.release_date || null,
          price: {
            input: roundPrice(model.cost?.input),
            output: roundPrice(model.cost?.output),
            cache: roundPrice(model.cost?.cache_read),
          },
        };
      }
    }
  }
  return models;
}

export function normalizeAggregator(kind, data, providers, config) {
  if (kind === "openrouter") return normalizeOpenRouter(data, providers, config);
  if (kind === "modelsdev") return normalizeModelsDev(data, providers, config);
  throw new Error(`未知聚合源类型：${kind}`);
}

export function buildAtlasIndex(providers) {
  const canons = new Set();
  for (const provider of providers) {
    for (const model of provider.models) {
      canons.add(canonical(model.id));
      canons.add(canonical(model.name));
    }
  }
  return canons;
}

export function atlasContains(id, atlasIndex) {
  const canon = canonicalModel(id);
  if (!canon) return false;
  if (atlasIndex.has(canon)) return true;
  if (canon.length < 8) return false;
  for (const known of atlasIndex) {
    if (known.length < 8) continue;
    if (known.startsWith(canon) || canon.startsWith(known)) return true;
  }
  return false;
}

export function priceDiff(previous, current) {
  const changes = [];
  for (const field of PRICE_FIELDS) {
    const before = previous?.[field];
    const after = current?.[field];
    if (before == null && after == null) continue;
    if (before == null || after == null || Math.abs(before - after) > 1e-6) {
      changes.push({ field, from: before ?? null, to: after ?? null });
    }
  }
  return changes;
}

export function diffAggregator(previousModels = {}, currentModels, atlasIndex) {
  const added = [];
  const removed = [];
  const priceChanges = [];

  for (const [id, model] of Object.entries(currentModels)) {
    const previous = previousModels[id];
    if (!previous) {
      added.push({ id, ...model, inAtlas: atlasContains(id, atlasIndex) });
      continue;
    }
    const changes = priceDiff(previous.price, model.price);
    if (changes.length) priceChanges.push({ id, name: model.name, changes });
  }

  for (const [id, model] of Object.entries(previousModels)) {
    if (!(id in currentModels)) removed.push({ id, ...model });
  }

  return { added, removed, priceChanges };
}

function setDifference(current, previous) {
  const before = new Set(previous || []);
  return current.filter((item) => !before.has(item));
}

export function diffOfficialPage(previousPage, currentPage) {
  if (!previousPage?.ok || !currentPage.ok) return null;
  const addedModels = setDifference(currentPage.models, previousPage.models);
  const removedModels = setDifference(previousPage.models, currentPage.models);
  const addedPrices = setDifference(currentPage.prices, previousPage.prices);
  const removedPrices = setDifference(previousPage.prices, currentPage.prices);
  const changed =
    addedModels.length + removedModels.length + addedPrices.length + removedPrices.length > 0;

  return { changed, addedModels, removedModels, addedPrices, removedPrices };
}

export function mergeOfficialPage(previousPage, currentPage) {
  if (!currentPage.ok && previousPage?.ok) {
    return {
      ...previousPage,
      lastError: currentPage.error,
      lastCheckedAt: currentPage.checkedAt,
    };
  }
  return currentPage;
}
