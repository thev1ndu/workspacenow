import { RouterProvider } from "react-aria-components";
import { Outlet, useHref, useNavigate, type NavigateOptions } from "react-router-dom";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/** Lets every HeroUI link and button `href` navigate client-side through React Router. */
export function RouterBridge() {
  const navigate = useNavigate();
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      <Outlet />
    </RouterProvider>
  );
}
