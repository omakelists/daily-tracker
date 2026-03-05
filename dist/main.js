import { j as jsxRuntimeExports } from "./_virtual/jsx-runtime.js";
/* empty css          */
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { initI18n } from "./util/i18n.js";
import { App } from "./App.js";
async function main() {
  await initI18n();
  createRoot(document.getElementById("root")).render(
    /* @__PURE__ */ jsxRuntimeExports.jsx(StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
  );
}
main();
