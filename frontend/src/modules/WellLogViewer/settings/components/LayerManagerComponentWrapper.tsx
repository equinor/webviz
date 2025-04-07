import React from "react";

import { WellLogCurveTypeEnum_api } from "@api";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { AreaPlotProvider } from "@modules/WellLogViewer/LayerFramework/dataProviders/plots/AreaPlotProvider";
import { LinearPlotProvider } from "@modules/WellLogViewer/LayerFramework/dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "@modules/WellLogViewer/LayerFramework/dataProviders/wellpicks/WellPicksProvider";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import type { ActionGroup } from "@modules/_shared/LayerFramework/Actions";
import type { GroupDelegate } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import {
    DataLayerManager,
    LayerManagerTopic,
} from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { DataLayerManagerComponent } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManagerComponent";
import { Group } from "@modules/_shared/LayerFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/LayerFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/LayerFramework/groups/groupTypes";
import type { ItemGroup } from "@modules/_shared/LayerFramework/interfacesAndTypes/entities";
import { LayerRegistry } from "@modules/_shared/LayerFramework/layers/LayerRegistry";
import { ShowChart, ViewDay } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom } from "jotai";

import "../../LayerFramework/registerFrameworkExtensions";
import { layerManagerAtom } from "../atoms/baseAtoms";
import { serializedManagerStateAtom } from "../atoms/persistedAtoms";

enum LayerActionIdents {
    CONTINUOUS_TRACK = "cont_track",
    DISCRETE_TRACK = "disc_track",
    SETTINGS = "settings",
    PLOT = "plot",
    WELL_PICKS = "well_picks",
}

enum PlotActionIdents {
    LINE = "line",
    AREA = "area",
    STACKED = "stacked",
    DIFF = "diff",
}

function usePersistedLayerManager(
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings,
): DataLayerManager | null {
    const queryClient = useQueryClient();

    const hasAppliedPersistedState = React.useRef<boolean>(false);
    const [layerManager, setLayerManager] = useAtom(layerManagerAtom);
    const [serializedManagerState, setSerializedManagerState] = useAtom(serializedManagerStateAtom);

    const persistManagerState = React.useCallback(
        function persistManagerState() {
            if (!layerManager) return;

            setSerializedManagerState(layerManager.serializeState());
        },
        [layerManager, setSerializedManagerState],
    );

    React.useEffect(
        function initalizeLayerManagerEffect() {
            const newLayerManager = new DataLayerManager(workbenchSession, workbenchSettings, queryClient);
            setLayerManager(newLayerManager);
            hasAppliedPersistedState.current = false;

            return () => newLayerManager.beforeDestroy();
        },
        [queryClient, setLayerManager, workbenchSession, workbenchSettings],
    );

    // applyPersistedManagerState(layerManager);
    React.useEffect(
        function applyManagerState() {
            if (!layerManager || !serializedManagerState) return;
            if (hasAppliedPersistedState.current) return;

            layerManager.deserializeState(serializedManagerState);

            hasAppliedPersistedState.current = true;
        },
        [serializedManagerState, layerManager],
    );

    React.useEffect(
        function setupManagerListenersEffect() {
            if (!layerManager) return;
            //
            persistManagerState();

            const unsubscribeDataRev = layerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.LAYER_DATA_REVISION)(persistManagerState);

            const unsubscribeExpands = layerManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistManagerState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [layerManager, persistManagerState],
    );

    return layerManager;
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
                    identifier: LayerActionIdents.CONTINUOUS_TRACK,
                    icon: <TrackIcon type={WellLogCurveTypeEnum_api.CONTINUOUS} />,
                },
                {
                    label: "Well picks",
                    identifier: LayerActionIdents.WELL_PICKS,
                },
            ],
        },
    ];
}

export type LayerManagerComponentWrapperProps = {
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayerManagerComponentWrapper(props: LayerManagerComponentWrapperProps): React.ReactNode {
    const layerManager = usePersistedLayerManager(props.workbenchSession, props.workbenchSettings);

    const layerActionCallback = React.useCallback(
        function layerActionCallback(identifier: string, groupDelegate: GroupDelegate) {
            if (!layerManager) return;

            switch (identifier) {
                case LayerActionIdents.WELL_PICKS:
                    return groupDelegate.appendChild(LayerRegistry.makeLayer(WellborePicksProvider.name, layerManager));

                case LayerActionIdents.CONTINUOUS_TRACK:
                    return groupDelegate.appendChild(GroupRegistry.makeGroup(GroupType.WELL_LOG_TRACK, layerManager));

                case PlotActionIdents.LINE:
                    return groupDelegate.appendChild(LayerRegistry.makeLayer(LinearPlotProvider.name, layerManager));
                case PlotActionIdents.AREA:
                    return groupDelegate.appendChild(LayerRegistry.makeLayer(AreaPlotProvider.name, layerManager));

                default:
                    break;
            }
        },
        [layerManager],
    );

    if (!layerManager) return <div />;

    return (
        <DataLayerManagerComponent
            title="Log config"
            dataLayerManager={layerManager}
            additionalHeaderComponents={null}
            groupActions={makeOptionsForGroup}
            onAction={layerActionCallback}
        />
    );
}
