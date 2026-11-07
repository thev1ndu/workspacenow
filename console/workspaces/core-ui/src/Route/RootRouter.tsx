import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { OverviewPage } from "@workspacenow/overview";
import { AppPage, CatalogPage } from "@workspacenow/studio";
import { routes } from "@workspacenow/types";
import { AppShell } from "../Layout/AppShell";
import { Layout } from "../Layout/Layout";
import { LoginPage } from "../pages/LoginPage";
import { OidcCallbackPage } from "../pages/OidcCallbackPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Protected } from "../Providers/Protected";
import { RouterBridge } from "../Providers/RouterBridge";
import { workspaces } from "../workspaces";

const router = createBrowserRouter([
  {
    element: <RouterBridge />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/login/callback", element: <OidcCallbackPage /> },
      {
        element: <Protected />,
        children: [
          {
            // Apps run full screen, outside the console.
            element: <AppShell />,
            children: [
              { path: routes.catalog, element: <CatalogPage /> },
              { path: routes.app, element: <AppPage /> },
            ],
          },
          {
            element: <Layout />,
            children: [
              { index: true, element: <OverviewPage workspaces={workspaces} /> },
              ...workspaces.map((workspace) => ({ path: workspace.basePath, children: workspace.routes })),
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function RootRouter() {
  return <RouterProvider router={router} />;
}
