import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAtlasIndex,
  closeBrowser,
  collectOfficialPage,
  diffAggregator,
  diffOfficialPage,
  fetchJson,
  mergeOfficialPage,
  normalizeAggregator,
  officialPagesFor,
  readJson,
} from "./lib.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const update = args.includes("--update");
const failOnChange = args.includes("--fail-on-change");
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const snapshotPath = resolve(projectRoot, argValue("--snapshot", "data/watch/snapshot.json"));
const reportPath = resolve(projectRoot, argValue("--json", "reports/watch-latest.json"));
const markdownPath = resolve(projectRoot, argValue("--md", "reports/watch-latest.md"));

const providers = readJson(join(projectRoot, "data/providers.json"));
const config = readJson(join(projectRoot, "scripts/watch/sources.json"));
const atlasIndex = buildAtlasIndex(providers);
const knownIds = new Set(
  providers.flatMap((provider) =>
    provider.models.flatMap((model) => [model.id.toLowerCase(), model.name.toLowerCase()]),
  ),
);

const previous = existsSync(snapshotPath) ? readJson(snapshotPath) : {};
const now = new Date().toISOString();
const firstRun = !previous.version || !previous.generatedAt;

function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  return Promise.all(Array.from({ length: Math.min(limit, items.length) }, run)).then(() => results);
}

async function checkAggregators() {
  const tracked = new Set(
    Object.values(config.providers).flatMap((provider) => Object.keys(provider.aggregators || {})),
  );

  return mapLimit([...tracked], 3, async (name) => {
    const definition = config.aggregators?.[name];
    if (!definition) {
      return { name, error: "sources.json 缺少聚合源定义" };
    }
    const previousEntry = previous.aggregators?.[name];
    try {
      const data = await fetchJson(definition.url, config.request || {});
      const models = normalizeAggregator(definition.kind, data, providers, config);
      const diff = previousEntry?.models ? diffAggregator(previousEntry.models, models, atlasIndex) : null;
      return {
        name,
        ok: true,
        baseline: !previousEntry?.models,
        modelCount: Object.keys(models).length,
        diff,
        snapshot: { ok: true, checkedAt: now, models },
      };
    } catch (error) {
      return {
        name,
        ok: false,
        error: error.message,
        snapshot: previousEntry ? { ...previousEntry, lastError: error.message, lastCheckedAt: now } : null,
      };
    }
  });
}

async function checkOfficial() {
  const jobs = [];
  for (const provider of providers) {
    const providerConfig = config.providers?.[provider.slug];
    if (!providerConfig) continue;
    for (const page of officialPagesFor(provider, config)) {
      jobs.push({ provider, page });
    }
  }

  return mapLimit(jobs, 4, async ({ provider, page }) => {
    const previousPage = previous.official?.[provider.slug]?.pages?.[page.url];
    const result = await collectOfficialPage(provider, page, config, knownIds);
    const merged = mergeOfficialPage(previousPage, result);
    return {
      slug: provider.slug,
      providerName: provider.name,
      page,
      result,
      snapshot: merged,
      baseline: !previousPage?.ok,
      diff: diffOfficialPage(previousPage, result),
    };
  });
}

function formatMoney(value) {
  if (value == null) return "—";
  const number = Number(value);
  if (number === 0) return "$0";
  return `$${Number(number.toFixed(6)).toString()}`;
}

function formatPrice(price) {
  const parts = [`in ${formatMoney(price?.input)}`];
  if (price?.output != null) parts.push(`out ${formatMoney(price.output)}`);
  if (price?.cache != null) parts.push(`cache ${formatMoney(price.cache)}`);
  return parts.join(" · ");
}

function formatContext(value) {
  return value == null ? "—" : Number(value).toLocaleString("en-US");
}

function tableCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function buildMarkdown(report) {
  const lines = [];
  const totalChanges =
    report.summary.newModels +
    report.summary.priceChanges +
    report.summary.removedModels +
    report.summary.officialChangedPages;

  lines.push("# Model Atlas 更新检测", "");
  lines.push(`- 生成时间：${report.generatedAt}`);
  lines.push(`- 快照：\`${report.snapshotPath}\``);
  lines.push(
    totalChanges
      ? `- 结论：检测到 **${totalChanges}** 项变化，请回官网核对后再更新数据。`
      : "- 结论：本次没有检测到模型或价格信号变化。",
  );
  lines.push("");

  lines.push("## 方案 A · 聚合目录", "");
  if (!report.aggregators.length) {
    lines.push("没有启用聚合目录。", "");
  } else {
    for (const item of report.aggregators) {
      if (!item.ok) {
        lines.push(`### ${item.name}`, "", `获取失败：${item.error}`, "");
        continue;
      }
      lines.push(`### ${item.name}`, "");
      lines.push(`追踪 ${item.modelCount} 个型号。`);
      if (item.baseline) {
        lines.push("", "本次建立基线，不产生变更告警。", "");
        continue;
      }
      const diff = item.diff || { added: [], removed: [], priceChanges: [] };
      lines.push("");
      if (diff.added.length) {
        lines.push(`#### 新增型号（${diff.added.length}）`, "");
        lines.push("| 型号 | 名称 | 上下文 | 价格（USD / 百万 tokens） | 本站 |");
        lines.push("| --- | --- | --- | --- | --- |");
        for (const model of diff.added.slice(0, 50)) {
          lines.push(
            `| ${tableCell(model.id)} | ${tableCell(model.name)} | ${formatContext(model.context)} | ${formatPrice(model.price)} | ${model.inAtlas ? "已收录" : "未收录（可能是别名）"} |`,
          );
        }
        if (diff.added.length > 50) lines.push("", `其余 ${diff.added.length - 50} 个新增型号已省略。`);
        lines.push("");
      }
      if (diff.priceChanges.length) {
        lines.push(`#### 价格或上下文变化（${diff.priceChanges.length}）`, "");
        lines.push("| 型号 | 变化 |");
        lines.push("| --- | --- |");
        for (const change of diff.priceChanges.slice(0, 50)) {
          const fields = change.changes
            .map((entry) => `${entry.field}: ${formatMoney(entry.from)} → ${formatMoney(entry.to)}`)
            .join("；");
          lines.push(`| ${tableCell(change.id)} | ${tableCell(fields)} |`);
        }
        if (diff.priceChanges.length > 50) {
          lines.push("", `其余 ${diff.priceChanges.length - 50} 条变化已省略。`);
        }
        lines.push("");
      }
      if (diff.removed.length) {
        lines.push(`#### 目录中消失（${diff.removed.length}）`, "");
        lines.push(diff.removed.slice(0, 30).map((model) => `- ${model.id}`).join("\n"));
        if (diff.removed.length > 30) lines.push(`- 其余 ${diff.removed.length - 30} 个已省略`);
        lines.push("");
      }
      if (!diff.added.length && !diff.priceChanges.length && !diff.removed.length) {
        lines.push("没有变化。", "");
      }
    }
  }

  lines.push("## 方案 B · 官方页面", "");
  const officialByProvider = new Map();
  for (const item of report.official) {
    const list = officialByProvider.get(item.slug) || [];
    list.push(item);
    officialByProvider.set(item.slug, list);
  }

  if (!officialByProvider.size) {
    lines.push("没有启用官方页面监控。", "");
  } else {
    for (const [, pages] of officialByProvider) {
      lines.push(`### ${pages[0].providerName}`, "");
      for (const item of pages) {
        if (!item.ok) {
          lines.push(`- [${item.page.label}](${item.page.url})：获取失败（${item.error}）`);
          continue;
        }
        if (item.baseline) {
          lines.push(
            `- [${item.page.label}](${item.page.url})：基线 ${item.modelCount} 个型号 / ${item.priceCount} 个价格信号${item.rendered ? " · Playwright" : ""}`,
          );
          continue;
        }
        if (!item.diff?.changed) {
          lines.push(`- [${item.page.label}](${item.page.url})：无变化${item.rendered ? " · Playwright" : ""}`);
          continue;
        }
        lines.push(
          `- [${item.page.label}](${item.page.url})：**信号变化**（型号 +${item.diff.addedModels.length}/-${item.diff.removedModels.length}，价格信号 +${item.diff.addedPrices.length}/-${item.diff.removedPrices.length}）${item.rendered ? " · Playwright" : ""}`,
        );
        if (item.diff.addedModels.length) {
          lines.push(`  - 新增型号：${item.diff.addedModels.slice(0, 20).join("、")}`);
        }
        if (item.diff.removedModels.length) {
          lines.push(`  - 消失型号：${item.diff.removedModels.slice(0, 20).join("、")}`);
        }
        if (item.diff.addedPrices.length) {
          lines.push(`  - 新增价格信号：${item.diff.addedPrices.slice(0, 20).join("、")}`);
        }
        if (item.diff.removedPrices.length) {
          lines.push(`  - 消失价格信号：${item.diff.removedPrices.slice(0, 20).join("、")}`);
        }
      }
      lines.push("");
    }
  }

  const unavailable = report.unavailable;
  if (unavailable.length) {
    lines.push("## 未获取到的页面", "");
    for (const item of unavailable) lines.push(`- ${item.label}：${item.error}（${item.url}）`);
    lines.push("");
  }

  const skipped = report.skippedOfficial;
  if (skipped.length) {
    lines.push("## 未监控的官方页面", "");
    for (const item of skipped) {
      lines.push(`- ${item.providerName}：${item.note || "已跳过官方页面"}（${item.url}）`);
    }
    lines.push("");
  }

  lines.push("## 核对提示", "");
  lines.push("- 聚合目录只作为发现线索，价格可能与官网人民币价、区域价或合同价不同。");
  lines.push("- 官方页面用型号与价格 token 组成信号；信号变化不等于一定是价格调整，请打开链接人工确认。");
  lines.push("- 确认并更新 `data/providers.json` 后，运行 `npm run watch:update` 接受新基线。");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("\n  Model Atlas watch\n");
  const aggregatorResults = await checkAggregators();
  const officialResults = await checkOfficial();

  const report = {
    generatedAt: now,
    firstRun,
    changed: false,
    summary: {
      newModels: 0,
      priceChanges: 0,
      removedModels: 0,
      officialChangedPages: 0,
    },
    aggregators: [],
    official: [],
    unavailable: [],
    skippedOfficial: providers
      .filter((provider) => config.providers?.[provider.slug]?.official?.skip)
      .map((provider) => ({
        slug: provider.slug,
        providerName: provider.name,
        url: provider.pricingUrl,
        note: config.providers[provider.slug].official.note || "",
      })),
    snapshotPath: snapshotPath.replace(`${projectRoot}/`, ""),
  };

  const nextAggregators = {};
  for (const item of aggregatorResults) {
    if (item.snapshot) nextAggregators[item.name] = item.snapshot;
    if (!item.ok) {
      report.aggregators.push({ name: item.name, ok: false, error: item.error });
      continue;
    }
    const diff = item.diff || { added: [], removed: [], priceChanges: [] };
    report.summary.newModels += diff.added.length;
    report.summary.priceChanges += diff.priceChanges.length;
    report.summary.removedModels += diff.removed.length;
    report.aggregators.push({
      name: item.name,
      ok: true,
      baseline: item.baseline,
      modelCount: item.modelCount,
      diff,
    });
  }

  const nextOfficial = {};
  for (const item of officialResults) {
    nextOfficial[item.slug] ||= { pages: {} };
    nextOfficial[item.slug].pages[item.page.url] = item.snapshot;

    if (!item.result.ok) {
      report.official.push({
        slug: item.slug,
        providerName: item.providerName,
        page: item.page,
        ok: false,
        error: item.result.error,
      });
      report.unavailable.push({
        label: `${item.providerName} / ${item.page.label}`,
        url: item.page.url,
        error: item.result.error,
      });
      continue;
    }

    if (item.diff?.changed) report.summary.officialChangedPages += 1;
    report.official.push({
      slug: item.slug,
      providerName: item.providerName,
      page: item.page,
      ok: true,
      baseline: item.baseline,
      rendered: item.snapshot.rendered === true,
      modelCount: item.snapshot.models?.length || 0,
      priceCount: item.snapshot.prices?.length || 0,
      diff: item.diff,
    });
  }

  report.changed =
    report.summary.newModels +
      report.summary.priceChanges +
      report.summary.removedModels +
      report.summary.officialChangedPages >
    0;

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, buildMarkdown(report), "utf8");

  if (update) {
    mkdirSync(dirname(snapshotPath), { recursive: true });
    writeFileSync(
      snapshotPath,
      `${JSON.stringify(
        {
          version: config.version,
          generatedAt: now,
          aggregators: nextAggregators,
          official: nextOfficial,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  const status = report.changed ? "检测到变化" : firstRun ? "已建立基线" : "无变化";
  console.log(`  ${status}`);
  for (const item of report.aggregators) {
    if (!item.ok) {
      console.log(`  ! ${item.name}: ${item.error}`);
      continue;
    }
    const diff = item.diff || { added: [], removed: [], priceChanges: [] };
    console.log(
      `  · ${item.name}: ${item.baseline ? "基线" : `+${diff.added.length} / -${diff.removed.length} / 价格 ${diff.priceChanges.length}`}（${item.modelCount} 型号）`,
    );
  }
  const changedPages = report.official.filter((item) => item.diff?.changed).length;
  const failedPages = report.official.filter((item) => !item.ok).length;
  console.log(
    `  · 官方页面: ${report.official.length} 页，变化 ${changedPages} 页，失败 ${failedPages} 页`,
  );
  console.log(`  → ${reportPath.replace(`${projectRoot}/`, "")}`);
  console.log(`  → ${markdownPath.replace(`${projectRoot}/`, "")}`);
  if (update) console.log(`  → ${snapshotPath.replace(`${projectRoot}/`, "")}\n`);
  else console.log("");

  if (failOnChange && report.changed) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(`\n  watch 失败：${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => closeBrowser());
