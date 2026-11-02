import { createFileRoute } from "@tanstack/react-router";
import { DEMO_MODE } from "../../lib/config.server";

/**
 * 데모 업로드 자리 — 데모 API가 내준 `uploadUrl`이 여기를 가리킨다. 파일은 저장하지 않고 받기만 한다
 * (데모 업로드는 자리표시 이미지로 보인다). 데모 모드가 아니면 없는 주소다.
 */
export const Route = createFileRoute("/api/demo-upload")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        if (!DEMO_MODE) return new Response(null, { status: 404 });
        await request.arrayBuffer();
        return new Response(null, { status: 200 });
      },
    },
  },
});
