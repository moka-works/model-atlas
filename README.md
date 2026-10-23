# Model Atlas · 国内外主流模型 API 价格一览

收集国内外主流模型 API 平台 (非中转站) 的最新模型型号、能力特点、规格限制与官方公开价格。

**本站只做模型信息收录，不提供 API 服务**：不代理、转售或转发任何厂商的 API，所有型号请回到厂商官网申请与使用。收录范围聚焦主流平台，不追求长尾覆盖。

覆盖文本与推理、多模态理解、语音、图像生成、视频生成 5 种类别的模型。

## 快速开始

```bash
make dev        # 构建并启动本地预览（默认 http://localhost:4173）
make build      # 仅生成静态站点到 dist/
make preview    # 仅启动预览服务
make clean      # 删除 dist/
```
## 数据与构建

零运行时依赖（无框架、无外部字体 / 脚本 / 图片），由 Node 脚本从 JSON 数据构建为纯 HTML/CSS/JS。

数据全部在 `data/` 下，改完重新 `make build` 即可，无需改动模板代码：

- `site.json` — 站点名、版本、编辑精选、方法说明文案
- `categories.json` — 五个类别：图标、色彩、选购提示
- `providers.json` — 厂商与型号：定价、规格、亮点、注意事项、官方链接

## 更新监测

`scripts/watch/` 是更新检测工具，配合 GitHub Actions 每天运行一次：

- **方案 A：聚合目录** — 从 OpenRouter、models.dev 抓取型号与美元价格，按厂商过滤后对比新增型号和价格变化。
- **方案 B：官方页面** — 抓取各厂商官方定价页，提取型号 ID 与价格 token 组成信号，与上次快照对比；适合发现官网直接上新或调价。
- 前端渲染页面（Kling、火山方舟、Vidu）使用 Playwright 获取完整内容；其余页面走普通 HTTP。
- 快照在 `data/watch/snapshot.json`，报告输出到 `reports/watch-latest.md` 与 `.json`（已 gitignore）。
- 规则在 `scripts/watch/sources.json`：厂商聚合源映射、型号正则、渲染开关、额外监控页面。

```bash
npm ci
npx playwright install chromium  # 首次运行或浏览器升级后执行

npm run watch         # 只检测并生成报告，不修改快照
npm run watch:update  # 确认变化、更新 data/providers.json 后，接受新基线
```

检测结果只是线索：聚合价可能与官网人民币价或区域价不同，官方页面信号变化也需要打开链接人工确认。已确认的更新再写入 `data/providers.json`，然后运行 `npm run watch:update`。目前 OpenAI 官方页会返回 403；Anthropic 模型总览有地区限制，暂时只监控可访问的定价页。

## 技术说明

- 渐进增强：搜索（`/` 或 `Ctrl/Cmd+K`）、筛选、复制型号 ID 均为增强功能，禁用 JS 后全部核心内容与导航仍可正常浏览
- 价格、规格与限制来自各厂商官网公开信息，最后核对日期 **2026-10-24**；价格可能随时调整，请以官网为准
- 厂商名称与商标归各自所有者，本站为非官方参考资料
