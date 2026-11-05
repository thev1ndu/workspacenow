import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { OverviewPage } from "@workspacenow/overview";
import { AppPage } from "@workspacenow/studio";
import { routes } from "@workspacenow/types";
import { Layout } from "../Layout/Layout";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Protected } from "../Providers/Protected";
import { RouterBridge } from "../Providers/RouterBridge";
import { workspaces } from "../workspaces";

const router = createBrowserRouter([
  {
    element: <RouterBridge />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: <Protected />,
        children: [
          {
            element: <Layout />,
            children: [
              { index: true, element: <OverviewPage workspaces={workspaces} /> },
              { path: routes.app, element: <AppPage /> },
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
