import { ArrowLeft } from "@carbon/react/icons";
import { useEffect, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Column, Grid, Heading, Link, Section, SkeletonText } from "@carbon/react";

import { globalConfig } from "@workspacenow/types";
import { Loading } from "./QueryState";
import { PageSkeleton } from "./Skeletons";

import styles from "./PageLayout.module.scss";

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

/** Page shell in Carbon's page-header pattern: optional back link, heading, description and actions over the page's content. */
export function PageLayout({ title, documentTitle, description, backHref, backLabel, actions, isLoading, children }: PageLayoutProps) {
  const tabTitle = documentTitle ?? (typeof title === "string" ? title : undefined);
  useEffect(() => {
    if (tabTitle) document.title = `${tabTitle} / ${globalConfig.installationName}`;
  }, [tabTitle]);

  return (
    <Grid fullWidth className={styles.page}>
      <Column sm={4} md={8} lg={16}>
        <header className={styles.header}>
          {backHref && (
            <Link as={RouterLink} to={backHref} size="md" className={styles.back}>
              <ArrowLeft size={16} aria-hidden />
              {backLabel ?? "Back"}
            </Link>
          )}
          <div className={styles.bar}>
            <div className={styles.titles}>
              {isLoading ? (
                <div className={styles.skeletonTitle}>
                  <SkeletonText heading width="14rem" />
                  <SkeletonText width="20rem" />
                </div>
              ) : (
                <>
                  <Heading className={styles.title}>{title}</Heading>
                  {description && <div className={styles.description}>{description}</div>}
                </>
              )}
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        </header>
        <Section>
          {isLoading ? (
            <Loading>
              <PageSkeleton />
            </Loading>
          ) : (
            children
          )}
        </Section>
      </Column>
    </Grid>
  );
}
