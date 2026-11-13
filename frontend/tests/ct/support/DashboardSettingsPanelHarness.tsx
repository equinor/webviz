import React from "react";

import { DashboardSettingsService } from "@framework/DashboardSettings/DashboardSettingsService";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";
import { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { ActiveDashboardContext } from "@framework/internal/components/ActiveDashboardBoundary";
import { ActiveSessionContext } from "@framework/internal/components/ActiveSessionBoundary";
import { DashboardSettingsPanel } from "@framework/internal/components/LeftSettingsPanel/private-components/dashboardSettingsPanel";
import type { Dashboard } from "@framework/internal/Dashboard";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

/**
 * Browser-side harness rendering the dashboard settings panel with the dashboard time active, and a source of it
 * that is stuck recomputing its options - so the setting never settles.
 */
export function DashboardSettingsPanelHarness(): React.JSX.Element {
    const [{ dashboard, session, guiMessageBroker }] = React.useState(() => {
        const dashboardSettingsService = new DashboardSettingsService();
        const time = dashboardSettingsService.addSetting(TIME_DASHBOARD_SETTING);
        const handle = time.registerConstraintSource("stuck-source");
        handle.updateConstraints([Date.UTC(2018, 0, 1), Date.UTC(2019, 0, 1)]);
        handle.markPending();

        const dashboard = { getDashboardSettingsService: () => dashboardSettingsService } as unknown as Dashboard;
        // Not in snapshot mode
        const session = {
            getPublishSubscribeDelegate: () => new PublishSubscribeDelegate(),
            makeSnapshotGetter: () => () => false,
        } as unknown as PrivateWorkbenchSession;

        return { dashboard, session, guiMessageBroker: new GuiMessageBroker() };
    });

    return (
        <ActiveSessionContext.Provider value={session}>
            <ActiveDashboardContext.Provider value={dashboard}>
                <DashboardSettingsPanel guiMessageBroker={guiMessageBroker} onClose={() => {}} />
            </ActiveDashboardContext.Provider>
        </ActiveSessionContext.Provider>
    );
}
