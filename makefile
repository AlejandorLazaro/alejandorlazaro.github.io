run_site:
	open http://127.0.0.1:4000
	bundle exec jekyll serve --no-watch

.PHONY: build-match-assets

MATCH_SRC_DIR := match-src
VITE_DIST_DIR := $(MATCH_SRC_DIR)/dist/assets
Jekyll_ASSET_DIR := assets

build-match-assets:
	@cd $(MATCH_SRC_DIR) && pnpm run build
	@mkdir -p $(Jekyll_ASSET_DIR)
	@echo "Copying + renaming Vite assets to stable filenames..."
	@cp -f $(VITE_DIST_DIR)/index-*.css $(Jekyll_ASSET_DIR)/match.css
	@cp -f $(VITE_DIST_DIR)/index-*.js $(Jekyll_ASSET_DIR)/match.js

.PHONY: build-botbound-assets

BOTBOUND_SRC_DIR := botbound-src
BOTBOUND_DIST_DIR := $(BOTBOUND_SRC_DIR)/dist/assets

build-botbound-assets:
	@cd $(BOTBOUND_SRC_DIR) && pnpm run build
	@mkdir -p $(Jekyll_ASSET_DIR)
	@echo "Copying + renaming Vite assets to stable filenames..."
	@cp -f $(BOTBOUND_DIST_DIR)/index-*.css $(Jekyll_ASSET_DIR)/botbound.css
	@cp -f $(BOTBOUND_DIST_DIR)/index-*.js $(Jekyll_ASSET_DIR)/botbound.js
