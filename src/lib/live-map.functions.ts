import { createServerFn } from "@tanstack/react-start";

export const getLiveMapUrl = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.LIVE_MAP_URL?.trim() || "";
  return { url };
});
