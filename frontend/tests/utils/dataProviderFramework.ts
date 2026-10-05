import type { QueryClient } from "@tanstack/react-query";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

// Just enough of a WorkbenchSession for constructing a DataProviderManager.
function makeFakeWorkbenchSession(): WorkbenchSession {
    return {
        getPublishSubscribeDelegate: () => new PublishSubscribeDelegate(),
        getEnsembleSet: () => ({ getRegularEnsembleArray: () => [] }),
        getUserCreatedItems: () => ({
            getIntersectionPolylines: () => ({ subscribe: () => () => {}, getPolylines: () => [] }),
        }),
    } as unknown as WorkbenchSession;
}

export function makeDataProviderManager(): DataProviderManager {
    return new DataProviderManager(makeFakeWorkbenchSession(), {} as WorkbenchSettings, {} as QueryClient);
}
