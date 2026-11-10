import { Tag } from "@carbon/react";
import type { HttpMethod } from "@workspacenow/types";

import styles from "./MethodChip.module.scss";

// Carbon Tag types: no yellow, so warning uses warm-gray.
const TYPES: Record<HttpMethod, "blue" | "green" | "warm-gray" | "red"> = {
  GET: "blue",
  POST: "green",
  PATCH: "warm-gray",
  PUT: "warm-gray",
  DELETE: "red",
};

export function MethodChip({ method }: { method: HttpMethod }) {
  return (
    <Tag size="sm" type={TYPES[method]} className={styles.method}>
      {method}
    </Tag>
  );
}
