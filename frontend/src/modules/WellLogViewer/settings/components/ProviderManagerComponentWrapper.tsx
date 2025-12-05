import React from "react";

import { HorizontalRule, MultilineChart, ShowChart, ViewDay } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { get } from "lodash";

import { WellLogCurveTypeEnum_api } from "@api";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { DataProvider } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group, isGroup } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { usePersistedDataProviderManager } from "@modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import { CustomDataProviderType } from "@modules/WellLogViewer/DataProviderFramework/dataProviderTypes";

import { dataProviderStateAtom, dataProviderManagerAtom } from "../atoms/baseAtoms";

import "../../DataProviderFramework/registerFrameworkExtensions";

enum RootActionIdents {
    CONTINUOUS_TRACK = "cont_track",
    DISCRETE_TRACK = "disc_track",
    WELL_PICKS = "well_picks",
}

enum PlotActionIdents {
    LINE = "line",
    AREA = "area",
    STACKED = "stacked",
    DIFF_GROUP = "diffGroup",
    DIFF_CURVE = "diffCurve",
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
                            identifier: PlotActionIdents.DIFF_GROUP,
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
            if (group.getGroupDelegate().getChildren().length >= 2) return [];
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
        providers: [CustomDataProviderType.WELLBORE_PICKS],
    },
    [GroupType.WELL_LOG_TRACK_CONT]: {
        groups: [GroupType.WELL_LOG_DIFF_GROUP],
        providers: [CustomDataProviderType.LINEAR_PLOT, CustomDataProviderType.AREA_PLOT],
    },
    [GroupType.WELL_LOG_TRACK_DISC]: {
        providers: [CustomDataProviderType.STACKED_PLOT],
    },
    [GroupType.WELL_LOG_DIFF_GROUP]: {
        providers: [CustomDataProviderType.DIFF_PLOT],
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

    const targetAllowedItems: string[] = get(ALLOWED_CHILDREN, [targetType, movedCategory], []);
    return targetAllowedItems.includes(movedIdent);
}

export type ProviderManagerComponentWrapperProps = {
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function ProviderManagerComponentWrapper(props: ProviderManagerComponentWrapperProps): React.ReactNode {
    const { workbenchSession, workbenchSettings } = props;
    const queryClient = useQueryClient();
    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [serializedState, setSerializedState] = useAtom(dataProviderStateAtom);

    usePersistedDataProviderManager({
        workbenchSession,
        workbenchSettings,
        queryClient,
        serializedState,
        setDataProviderManager,
        setSerializedState,
    });

    const groupActionCallback = React.useCallback(
        function groupActionCallback(identifier: string, groupDelegate: GroupDelegate) {
            if (!dataProviderManager) return;

            switch (identifier) {
                case RootActionIdents.WELL_PICKS:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(
                            CustomDataProviderType.WELLBORE_PICKS,
                            dataProviderManager,
                        ),
                    );

                case RootActionIdents.CONTINUOUS_TRACK:
                    return groupDelegate.appendChild(
                        GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK_CONT, dataProviderManager),
                    );

                case RootActionIdents.DISCRETE_TRACK:
                    return groupDelegate.appendChild(
                        GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK_DISC, dataProviderManager),
                    );

                case PlotActionIdents.DIFF_GROUP: {
                    const diffGroup = GroupRegistry.makeGroup(GroupType.WELL_LOG_DIFF_GROUP, dataProviderManager);

                    diffGroup
                        .getGroupDelegate()
                        .appendChild(
                            DataProviderRegistry.makeDataProvider(
                                CustomDataProviderType.DIFF_PLOT,
                                dataProviderManager,
                                "Primary curve",
                            ),
                        );
                    diffGroup
                        .getGroupDelegate()
                        .appendChild(
                            DataProviderRegistry.makeDataProvider(
                                CustomDataProviderType.DIFF_PLOT,
                                dataProviderManager,
                                "Secondary curve",
                            ),
                        );

                    return groupDelegate.appendChild(diffGroup);
                }

                case PlotActionIdents.DIFF_CURVE:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(CustomDataProviderType.DIFF_PLOT, dataProviderManager),
                    );

                case PlotActionIdents.LINE:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(CustomDataProviderType.LINEAR_PLOT, dataProviderManager),
                    );
                case PlotActionIdents.AREA:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(CustomDataProviderType.AREA_PLOT, dataProviderManager),
                    );

                case PlotActionIdents.STACKED:
                    return groupDelegate.appendChild(
                        DataProviderRegistry.makeDataProvider(CustomDataProviderType.STACKED_PLOT, dataProviderManager),
                    );

                default:
                    break;
            }
        },
        [dataProviderManager],
    );

    if (!dataProviderManager) return <div />;

    return (
        <DataProviderManagerComponent
            title="Log config"
            dataProviderManager={dataProviderManager}
            additionalHeaderComponents={null}
            groupActions={makeOptionsForGroup}
            onAction={groupActionCallback}
            isMoveAllowed={checkManagerMove}
        />
    );
}
