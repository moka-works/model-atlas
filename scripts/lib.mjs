import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value = "") {
  return escapeHtml(value);
}

export function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function modelAnchor(model) {
  return `model-${slugify(model.id || model.name)}`;
}

export function formatDate(value = "") {
  return String(value).replaceAll("-", ".");
}

export function unique(items) {
  return [...new Set(items)];
}

export function modelInCategory(model, categoryId) {
  return model.category === categoryId || Boolean(model.alsoIn?.includes(categoryId));
}

export function loadSiteData(root = process.cwd()) {
  return {
    site: readJson(join(root, "data/site.json")),
    categories: readJson(join(root, "data/categories.json")),
    rawProviders: readJson(join(root, "data/providers.json")),
  };
}

export function prepareData({ site, categories, rawProviders }) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));

  const providerOrder = site.providerOrder || [];
  const audienceRank = new Map(providerOrder.map((slug, index) => [slug, index]));
  const sourceIndex = new Map(rawProviders.map((provider, index) => [provider.slug, index]));
  const unlisted = rawProviders.filter((provider) => !audienceRank.has(provider.slug));
  const unknown = providerOrder.filter((slug) => !sourceIndex.has(slug));
  if (unlisted.length) {
    console.warn(`  ! 未在 site.providerOrder 中列出的厂商：${unlisted.map((provider) => provider.slug).join(", ")}`);
  }
  if (unknown.length) {
    console.warn(`  ! site.providerOrder 中存在未知厂商：${unknown.join(", ")}`);
  }

  const orderedProviders = [...rawProviders].sort((a, b) => {
    const groupA = a.country === "中国" ? 0 : 1;
    const groupB = b.country === "中国" ? 0 : 1;
    return (
      groupA - groupB ||
      (audienceRank.get(a.slug) ?? 9999) - (audienceRank.get(b.slug) ?? 9999) ||
      sourceIndex.get(a.slug) - sourceIndex.get(b.slug)
    );
  });

  const providers = orderedProviders.map((provider, providerIndex) => {
    const models = provider.models.map((model) => {
      const category = categoryMap.get(model.category);
      if (!category) {
        throw new Error(`未知分类 “${model.category}”（厂商 ${provider.name} / 模型 ${model.name}）`);
      }
      for (const alsoIn of model.alsoIn || []) {
        if (!categoryMap.has(alsoIn)) {
          throw new Error(`未知的附加分类 “${alsoIn}”（厂商 ${provider.name} / 模型 ${model.name}）`);
        }
      }
      return {
        ...model,
        anchor: modelAnchor(model),
        categoryMeta: category,
      };
    });

    const providerCategoryIds = unique(models.flatMap((model) => [model.category, ...(model.alsoIn || [])])).sort(
      (a, b) => categoryOrder.get(a) - categoryOrder.get(b),
    );

    return {
      ...provider,
      order: providerIndex,
      audienceRank: audienceRank.get(provider.slug) ?? 9999,
      isChina: provider.country === "中国",
      group: provider.country === "中国" ? "cn" : "intl",
      models,
      categories: providerCategoryIds.map((id) => categoryMap.get(id)),
      modelCount: models.length,
    };
  });

  const categoriesWithStats = categories.map((category) => {
    const models = providers.flatMap((provider) =>
      provider.models
        .filter((model) => modelInCategory(model, category.id))
        .map((model) => ({ ...model, provider })),
    );
    const providerCount = new Set(models.map((model) => model.provider.slug)).size;

    return {
      ...category,
      providers: providers.filter((provider) =>
        provider.models.some((model) => modelInCategory(model, category.id)),
      ),
      models,
      providerCount,
      modelCount: models.length,
    };
  });

  const categoriesWithProviders = categoriesWithStats.map(({ models, ...category }) => category);
  const totalModels = providers.reduce((count, provider) => count + provider.modelCount, 0);
  const stats = {
    providerCount: providers.length,
    modelCount: totalModels,
    categoryCount: categories.length,
    chinaProviderCount: providers.filter((provider) => provider.isChina).length,
    intlProviderCount: providers.filter((provider) => !provider.isChina).length,
    categories: categoriesWithStats,
  };

  const pickCategoryMap = new Map(categoriesWithStats.map((category) => [category.id, category]));
  const editorPicks = (site.editorPicks || [])
    .map((pick) => {
      const provider = providers.find((item) => item.slug === pick.provider);
      const model = provider?.models.find((item) => item.id === pick.model);
      if (!provider || !model) {
        console.warn(
          `  ! 编辑精选找不到厂商或型号：${pick.provider}/${pick.model}（已跳过）`,
        );
        return null;
      }
      return {
        ...pick,
        provider,
        model,
        categoryMeta: pickCategoryMap.get(model.category),
      };
    })
    .filter(Boolean);

  return {
    site,
    categories,
    categoriesWithStats,
    categoriesWithProviders,
    providers,
    stats,
    editorPicks,
  };
}
