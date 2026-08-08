run_site:
	open http://127.0.0.1:4000
	bundle exec jekyll serve

.PHONY: build-match-assets

REACT_SRC_DIR := react-src
VITE_DIST_DIR := $(REACT_SRC_DIR)/dist/assets
Jekyll_ASSET_DIR := assets

build-match-assets:
	@cd $(REACT_SRC_DIR) && pnpm run build
	@mkdir -p $(Jekyll_ASSET_DIR)
	@echo "Copying + renaming Vite assets to stable filenames..."
	@cp -f $(VITE_DIST_DIR)/index-*.css $(Jekyll_ASSET_DIR)/match.css
	@cp -f $(VITE_DIST_DIR)/index-*.js $(Jekyll_ASSET_DIR)/match.js
