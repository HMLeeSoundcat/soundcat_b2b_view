import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    assetsInlineLimit: (filePath: string) => {
      if (filePath.endsWith("config.json")) return false;
      return undefined;
    },
    rollupOptions: {
      output: {
        // JS, CSS, 이미지 등 자산의 폴더 경로 지정
        assetFileNames: assetInfo => {
          const 원본파일명 = (assetInfo.names && assetInfo.names[0]) || assetInfo.name || "";
          if (원본파일명.endsWith("config.json")) return "apps/b2b_view/assets/config.json";
          return "apps/b2b_view/assets/[name]-[hash][extname]";
        },
        chunkFileNames: "apps/b2b_view/assets/[name]-[hash].js",
        entryFileNames: "apps/b2b_view/assets/[name]-[hash].js",
      },
    },
  },
});
