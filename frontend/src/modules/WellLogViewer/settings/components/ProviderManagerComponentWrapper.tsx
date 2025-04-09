import React from "react";

import { WellLogCurveTypeEnum_api } from "@api";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { AreaPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/AreaPlotProvider";
import { LinearPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/wellpicks/WellPicksProvider";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import {
    DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
// import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { ShowChart, ViewDay } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom } from "jotai";

import { providerManagerAtom } from "../atoms/baseAtoms";
import { serializedManagerStateAtom } from "../atoms/persistedAtoms";
import "../../DataProviderFramework/registerFrameworkExtensions";

enum RootActionIdents {
    CONTINUOUS_TRACK = "cont_track",
    DISCRETE_TRACK = "disc_track",
    SETTINGS = "settings",
    WELL_PICKS = "well_picks",
}

enum PlotActionIdents {
    LINE = "line",
    AREA = "area",
    STACKED = "stacked",
    DIFF = "diff",
}

function usePersistedProviderManager(
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings,
): DataProviderManager | null {
    const queryClient = useQueryClient();

    const hasAppliedPersistedState = React.useRef<boolean>(false);
    const [providerManager, setProviderManager] = useAtom(providerManagerAtom);
    const [serializedManagerState, setSerializedManagerState] = useAtom(serializedManagerStateAtom);

    const persistManagerState = React.useCallback(
        function persistManagerState() {
            if (!providerManager) return;

            setSerializedManagerState(providerManager.serializeState());
        },
        [providerManager, setSerializedManagerState],
    );

    React.useEffect(
        function initializeProviderManagerEffect() {
            const newProviderManager = new DataProviderManager(workbenchSession, workbenchSettings, queryClient);
            setProviderManager(newProviderManager);
            hasAppliedPersistedState.current = false;

            return () => newProviderManager.beforeDestroy();
        },
        [queryClient, setProviderManager, workbenchSession, workbenchSettings],
    );

    React.useEffect(
        function applyManagerState() {
            if (!providerManager || !serializedManagerState) return;
            if (hasAppliedPersistedState.current) return;

            providerManager.deserializeState(serializedManagerState);

            hasAppliedPersistedState.current = true;
        },
        [serializedManagerState, providerManager],
    );

    React.useEffect(
        function setupManagerListenersEffect() {
            if (!providerManager) return;
            //
            persistManagerState();

            const unsubscribeDataRev = providerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION)(persistManagerState);

            const unsubscribeExpands = providerManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistManagerState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [providerManager, persistManagerState],
    );

    return providerManager;
}

function makeOptionsForGroup(group: ItemGroup): ActionGroup[] {
    if (group instanceof Group && group.getGroupType() === GroupType.WELL_LOG_TRACK) {
        return [
            {
                label: "Plots",
                children: [
                    { icon: <ShowChart fontSize="inherit" />, label: "Line plot", identifier: PlotActionIdents.LINE },
                    { icon: <ShowChart fontSize="inherit" />, label: "Area plot", identifier: PlotActionIdents.AREA },
                    {
                        icon: <ViewDay fontSize="inherit" />,
                        label: "Stacked plot",
                        identifier: PlotActionIdents.STACKED,
                    },
                    {
                        icon: <ShowChart fontSize="inherit" />,
                        label: "Differential plot",
                        identifier: PlotActionIdents.DIFF,
                    },
                ],
            },
        ];
    }

    return [
        {
            label: "Log viewer",
            children: [
                {
                    label: "Continuous Track",
                    identifier: RootActionIdents.CONTINUOUS_TRACK,
                    icon: <TrackIcon type={WellLogCurveTypeEnum_api.CONTINUOUS} />,
                },
                {
                    label: "Well picks",
                    identifier: RootActionIdents.WELL_PICKS,
                },
            ],
        },
    ];
}

export type ProviderManagerComponentWrapperProps = {
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function ProviderManagerComponentWrapper(props: ProviderManagerComponentWrapperProps): React.ReactNode {
    const providerManager = usePersistedProviderManager(props.workbenchSession, props.workbenchSettings);

    const groupActionCallback = React.useCallback(
        function groupActionCallback(identifier: string, groupDelegate: GroupDelegate) {
            if (!providerManager) return;

            switch (identifier) {
                case RootActionIdents.WELL_PICKS:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(WellborePicksProvider.name, providerManager),
                    );

                // case RootActionIdents.CONTINUOUS_TRACK:
                //     return groupDelegate.appendChild(
                //         GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK, providerManager),
                //     );

                // case PlotActionIdents.LINE:
                //     return groupDelegate.appendChild(
                //         DataProviderRegistry.makeDataProvider(LinearPlotProvider.name, providerManager),
                //     );
                // case PlotActionIdents.AREA:
                //     return groupDelegate.appendChild(
                //         DataProviderRegistry.makeDataProvider(AreaPlotProvider.name, providerManager),
                //     );

                default:
                    break;
            }
        },
        [providerManager],
    );

    if (!providerManager) return <div />;

    return (
        <DataProviderManagerComponent
            title="Log config"
            dataProviderManager={providerManager}
            additionalHeaderComponents={null}
            groupActions={makeOptionsForGroup}
            onAction={groupActionCallback}
        />
    );
}
