import { Chip, Link } from "@heroui/react";
import { ChevronRight } from "@workspacenow/icons";
import { TokenUsageChart } from "@workspacenow/ai";
import { useAuthHooks } from "@workspacenow/auth";
import { useSession } from "@workspacenow/api-client";
import { EntryPointOutcomesChart, HealthChart } from "@workspacenow/control";
import { globalConfig } from "@workspacenow/types";
import { PageLayout, SectionCard, type WorkspaceModule } from "@workspacenow/views";
import { ActivityChart } from "./subComponents/ActivityChart";
import { AppsSection } from "./subComponents/AppsSection";
import { NeedsAttentionCard } from "./subComponents/NeedsAttentionCard";

export function OverviewPage({ workspaces }: { workspaces: WorkspaceModule[] }) {
  const { userInfo } = useAuthHooks();
  const session = useSession();

  return (
    <PageLayout
      title={globalConfig.organizationName}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span>Signed in as {userInfo?.name ?? ""}</span>
          {session.data?.roles.map((role) => (
            <Chip key={role} size="sm" variant="soft" color="accent">
              {role}
            </Chip>
          ))}
        </span>
      }
    >
      <div className="grid gap-6">
        <AppsSection />

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <NeedsAttentionCard />
          <HealthChart />
        </div>

        <ActivityChart />

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <EntryPointOutcomesChart />
          <TokenUsageChart />
        </div>

        <SectionCard title="Workspaces" flush>
          <div className="grid md:grid-cols-2">
            {workspaces.map((workspace, i) => (
              <Link
                key={workspace.key}
                href={workspace.basePath}
                className={[
                  "group flex items-start gap-3 rounded-none px-5 py-4 text-left no-underline transition-colors hover:bg-surface-secondary",
                  i > 0 ? "border-t border-separator" : "",
                  i === 1 ? "md:border-t-0" : "",
                  i % 2 === 1 ? "md:border-l md:border-separator" : "",
                ].join(" ")}
              >
                <span className="mt-0.5 text-muted [&_svg]:size-4">{workspace.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{workspace.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{workspace.description}</span>
                </span>
                <ChevronRight className="mt-0.5 size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
