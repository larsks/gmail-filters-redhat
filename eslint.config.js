import js from "@eslint/js";
import googleappsscript from "eslint-plugin-googleappsscript";
import fs from "fs";
import path from "path";

// In Google Apps Script, all top-level functions share a global scope across
// files. Extract them so ESLint doesn't flag cross-file references.
function getProjectGlobals() {
  const globals = {};
  const dir = path.dirname(new URL(import.meta.url).pathname);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js") || file === "eslint.config.js") continue;
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    for (const match of content.matchAll(/^function\s+(\w+)/gm)) {
      globals[match[1]] = "readonly";
    }
  }
  return globals;
}

export default [
  {
    ignores: ["eslint.config.js"],
  },
  js.configs.recommended,
  {
    files: ["*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...googleappsscript.environments.googleappsscript.globals,
        ...getProjectGlobals(),
      },
    },
    rules: {
      "no-unused-vars": ["error", { vars: "local" }],
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        console: "readonly",
      },
    },
  },
];
