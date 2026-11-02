import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // .env의 SAYREN_*를 서버 코드가 읽는 process.env에 싣는다. 셸에서 준 값이 우선한다.
  // SAYREN_TOKEN(셀러 계정 토큰)은 싣지 않는다 — 사이트 코드가 셀러 토큰을 읽지 못하게
  const { SAYREN_TOKEN: _cliToken, ...env } = loadEnv(mode, process.cwd(), "SAYREN_");
  Object.assign(process.env, env, { ...process.env });
  // dev·preview 포트는 PORT(호스팅 편집 환경이 넣는다), 없으면 4010
  const port = Number(process.env.PORT) || 4010;
  return {
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
});
