import { GlobalProviders } from "./Providers/GlobalProviders";
import { RootRouter } from "./Route/RootRouter";

export function CoreUI() {
  return (
    <GlobalProviders>
      <RootRouter />
    </GlobalProviders>
  );
}
