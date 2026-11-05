import { Button } from "@heroui/react";
import { NoDataFound, PageLayout } from "@workspacenow/views";

export function NotFoundPage() {
  return (
    <PageLayout title="Page not found">
      <NoDataFound
        message="There is nothing at this address."
        action={
          <Button variant="secondary" size="sm" onPress={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    </PageLayout>
  );
}
