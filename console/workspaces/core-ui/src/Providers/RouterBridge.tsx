import { Outlet } from "react-router-dom";

/** Router context for the shell; react-router Links navigate client-side on their own. */
export function RouterBridge() {
  return <Outlet />;
}
