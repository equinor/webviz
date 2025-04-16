import React from "react";

import { WellLogCurveTypeEnum_api } from "@api";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { AreaPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/AreaPlotProvider";
import { DiffPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/LinearPlotProvider";
import { StackedPlotProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/plots/StackedPlotProvider";
import { WellborePicksProvider } from "@modules/WellLogViewer/DataProviderFramework/dataProviders/wellpicks/WellPicksProvider";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { DataProvider } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import {
    DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group, isGroup } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { HorizontalRule, MultilineChart, ShowChart, ViewDay } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom } from "jotai";
import _ from "lodash";

import { providerManagerAtom } from "../atoms/baseAtoms";
import { serializedManagerStateAtom } from "../atoms/persistedAtoms";

// import type { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import("../../DataProviderFramework/registerFrameworkExtensions");

// @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
let DataProviderRegistry;
import("@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry").then(
    ({ DataProviderRegistry: provider }) => {
        DataProviderRegistry = provider;
    },
);

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
    DIFF_CURVE = "diffCurve",
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
    switch (group instanceof Group && group.getGroupType()) {
        case GroupType.WELL_LOG_TRACK_CONT:
            return [
                {
                    label: "Plots",
                    children: [
                        {
                            icon: <ShowChart fontSize="inherit" />,
                            label: "Line plot",
                            identifier: PlotActionIdents.LINE,
                        },
                        {
                            // TODO: Newer versions of MUI has a  "area chart" icon
                            icon: <ShowChart fontSize="inherit" />,
                            label: "Area plot",
                            identifier: PlotActionIdents.AREA,
                        },
                        {
                            icon: <MultilineChart fontSize="inherit" />,
                            label: "Differential plot",
                            identifier: PlotActionIdents.DIFF,
                        },
                    ],
                },
            ];

        case GroupType.WELL_LOG_TRACK_DISC:
            return [
                {
                    label: "Plots",
                    children: [
                        {
                            icon: <ViewDay fontSize="inherit" />,
                            label: "Stacked plot",
                            identifier: PlotActionIdents.STACKED,
                        },
                    ],
                },
            ];

        case GroupType.WELL_LOG_DIFF_GROUP:
            return [
                {
                    label: "Plots",
                    children: [
                        {
                            icon: <MultilineChart fontSize="inherit" />,
                            label: "Differential plot curve",
                            identifier: PlotActionIdents.DIFF_CURVE,
                        },
                    ],
                },
            ];

        default:
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
                            label: "Discrete Track",
                            identifier: RootActionIdents.DISCRETE_TRACK,
                            icon: <ViewDay fontSize="inherit" />,
                        },
                        {
                            label: "Well picks",
                            identifier: RootActionIdents.WELL_PICKS,
                            icon: <HorizontalRule fontSize="inherit" />,
                        },
                    ],
                },
            ];
    }
}

const ALLOWED_CHILDREN = {
    [GroupType.VIEW]: {
        groups: [GroupType.WELL_LOG_TRACK_CONT, GroupType.WELL_LOG_TRACK_DISC],
        providers: [WellborePicksProvider.name],
    },
    [GroupType.WELL_LOG_TRACK_CONT]: {
        groups: [GroupType.WELL_LOG_DIFF_GROUP],
        providers: [LinearPlotProvider.name, AreaPlotProvider.name],
    },
    [GroupType.WELL_LOG_TRACK_DISC]: {
        providers: [StackedPlotProvider.name],
    },
    [GroupType.WELL_LOG_DIFF_GROUP]: {
        providers: [DiffPlotProvider.name],
    },
} as const;

function getDestinationType(itemGroup: ItemGroup): GroupType {
    if (itemGroup instanceof DataProviderManager) return GroupType.VIEW;
    if (isGroup(itemGroup)) return itemGroup.getGroupType();

    throw new Error("Excepted an item group type");
}

function getMovedItemIdent(item: Item): string {
    if (isGroup(item)) return item.getGroupType();
    if (item instanceof DataProvider) return item.getType();

    throw new Error("Expected moved item to have a valid key");
}

function checkManagerMove(movedItem: Item, destinationGroup: ItemGroup): boolean {
    const targetType = getDestinationType(destinationGroup);
    const movedCategory = isGroup(movedItem) ? "groups" : "providers";
    const movedIdent = getMovedItemIdent(movedItem);

    const targetAllowedItems: string[] = _.get(ALLOWED_CHILDREN, [targetType, movedCategory], []);
    return targetAllowedItems.includes(movedIdent);
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
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(WellborePicksProvider.name, providerManager),
                    );

                case RootActionIdents.CONTINUOUS_TRACK:
                    return groupDelegate.appendChild(
                        GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK_CONT, providerManager),
                    );

                case RootActionIdents.DISCRETE_TRACK:
                    return groupDelegate.appendChild(
                        GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK_DISC, providerManager),
                    );

                case PlotActionIdents.DIFF: {
                    const diffGroup = GroupRegistry.makeGroup(GroupType.WELL_LOG_DIFF_GROUP, providerManager);

                    diffGroup.getGroupDelegate().appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(DiffPlotProvider.name, providerManager),
                    );
                    diffGroup.getGroupDelegate().appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(DiffPlotProvider.name, providerManager),
                    );

                    return groupDelegate.appendChild(diffGroup);
                }

                case PlotActionIdents.DIFF_CURVE:
                    return groupDelegate.appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(DiffPlotProvider.name, providerManager),
                    );

                case PlotActionIdents.LINE:
                    return groupDelegate.appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(LinearPlotProvider.name, providerManager),
                    );
                case PlotActionIdents.AREA:
                    return groupDelegate.appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(AreaPlotProvider.name, providerManager),
                    );

                case PlotActionIdents.STACKED:
                    return groupDelegate.appendChild(
                        // @ts-expect-error -- dumb workaround, waiting for circular dependency pr to be available
                        DataProviderRegistry.makeDataProvider(StackedPlotProvider.name, providerManager),
                    );

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
            isMoveAllowed={checkManagerMove}
        />
    );
}
