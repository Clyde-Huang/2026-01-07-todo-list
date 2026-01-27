import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier"; // ✅ 1. 匯入 Prettier 設定

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      ...js.configs.recommended.rules,

      // 1. 強制要求宣告時必須賦值 (針對 let)
      // 如果你寫 let a; 就會報錯
      "init-declarations": ["error", "always"],

      // 1.5 額外推薦：如果變數沒被重新賦值，強制使用 const
      "prefer-const": "error",

      // 2. 強制使用 camelCase 駝峰式命名 (如 firstName)
      camelcase: ["error", { properties: "always" }],
      
      // 3. 禁止使用 var，強制用 let/const (符合現代標準)
      "no-var": "error",
    },
  },
  eslintConfigPrettier, // ✅ 2. 放在陣列最後一項！
]);
