import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthHooks } from "@workspacenow/auth";
import type { PlatformEvent } from "@workspacenow/types";
import { streamEvents } from "../apis/stream";

const listeners = new Set<(event: PlatformEvent) => void>();

// Calls onEvent for every live platform event while the component is mounted.
export function useEventStream(onEvent: (event: PlatformEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  useEffect(() => {
    const listener = (event: PlatformEvent) => handler.current(event);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);
}

// Keeps the one SSE connection open and refreshes active queries when the platform changes.
export function LiveUpdates() {
  const { isAuthenticated, getToken } = useAuthHooks();
  const queryClient = useQueryClient();
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    void streamEvents({
      getToken: () => tokenRef.current(),
      signal: controller.signal,
      onEvent: (event) => {
        for (const listener of listeners) listener(event);
        clearTimeout(timer);
        timer = setTimeout(() => void queryClient.invalidateQueries(), 300);
      },
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, queryClient]);

  return null;
}
