import { useEffect, type ReactNode } from "react";
import { Link } from "@heroui/react";
import { ArrowLeft } from "@workspacenow/icons";
import { globalConfig } from "@workspacenow/types";
import { LoadingSkeleton } from "./QueryState";

export interface PageLayoutProps {
  title: ReactNode;
  /** Plain-text title for the browser tab when `title` is not a string. */
  documentTitle?: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  children: ReactNode;
}

/** Page shell: optional back link, title, description and actions over the page's content. */
export function PageLayout({ title, documentTitle, description, backHref, backLabel, actions, isLoading, children }: PageLayoutProps) {
  const tabTitle = documentTitle ?? (typeof title === "string" ? title : undefined);
  useEffect(() => {
    if (tabTitle) document.title = `${tabTitle} / ${globalConfig.installationName}`;
  }, [tabTitle]);

  return (
    <div className="w-full px-6 py-8 lg:px-10">
      <header className="mb-8">
        {backHref && (
          <Link href={backHref} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted no-underline hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            {backLabel ?? "Back"}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <div className="mt-1.5 text-sm text-muted">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </header>
      {isLoading ? <LoadingSkeleton /> : children}
    </div>
  );
}
