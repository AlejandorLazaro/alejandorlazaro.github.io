
  # Portfolio Swipe App

  This is a code bundle for Portfolio Swipe App. The original project is available at https://www.figma.com/design/XJej9mfdUGRjGCqxWA8rNG/Portfolio-Swipe-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Updating the main Match page

  After building (`pnpm run build`), copy the generated `dist/assets/index-*` files to the `assets/index-*` folder, so the main `_layouts/match.html` can read it.

  ```
  $ vite build
vite v6.3.5 building for production...
(node:52714) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
✓ 2043 modules transformed.
dist/index.html                   0.42 kB │ gzip:   0.29 kB
dist/assets/index-Czw3vuCv.css   97.88 kB │ gzip:  15.96 kB
dist/assets/index-D4XsLath.js   526.81 kB │ gzip: 157.29 kB
```