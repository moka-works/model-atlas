NODE ?= node
PORT ?= 4173

.PHONY: help build dev preview clean

help:
	@echo "Model Atlas — 静态站点"
	@echo ""
	@echo "  make build     生成静态站点到 dist/"
	@echo "  make dev       构建并启动本地预览（默认端口 4173）"
	@echo "  make preview   仅启动预览服务，不重新构建"
	@echo "  make clean     删除 dist/"

build:
	$(NODE) scripts/build.mjs

dev: build
	PORT=$(PORT) $(NODE) scripts/serve.mjs

preview:
	PORT=$(PORT) $(NODE) scripts/serve.mjs

clean:
	rm -rf dist
