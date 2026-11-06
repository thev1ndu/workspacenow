import { globalConfig, type PlatformEvent } from "@workspacenow/types";
import { SERVICE_BASE, type GetToken } from "../utils/http";

export interface EventStreamOptions {
  getToken: GetToken;
  onEvent: (event: PlatformEvent) => void;
  signal: AbortSignal;
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

// Reads the platform's SSE stream with fetch so the token travels in a header, never in the URL.
export async function streamEvents({ getToken, onEvent, signal }: EventStreamOptions): Promise<void> {
  if (!globalConfig.apiBaseUrl) return;
  const url = `${globalConfig.apiBaseUrl.replace(/\/+$/, "")}${SERVICE_BASE}/events/stream`;
  let lastEventId = "";
  let delay = 1000;
  while (!signal.aborted) {
    try {
      const token = await getToken();
      const response = await fetch(url, {
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}`, ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}) },
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`stream answered ${response.status}`);
      delay = 1000;
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let end: number;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
          const id = frame.split("\n").find((l) => l.startsWith("id:"))?.slice(3).trim();
          if (id) lastEventId = id;
          if (data) onEvent(JSON.parse(data) as PlatformEvent);
        }
      }
    } catch {
      if (signal.aborted) return;
    }
    await wait(delay, signal);
    delay = Math.min(delay * 2, 30_000);
  }
}
