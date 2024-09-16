import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { IsMoveAllowedArgs, SortableList } from "@lib/components/SortableList";
import { Add } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useSetAtom } from "jotai";

import { layerManagerAtom } from "./atoms/baseAtoms";

import { LayerManager } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { SharedSetting } from "../layers/SharedSetting";
import { View } from "../layers/View";
import { LayersActionGroup, LayersActions } from "../layers/components/layersActions";
import { makeComponent } from "../layers/components/utils";
import { GroupBaseTopic } from "../layers/delegates/GroupDelegate";
import { DrilledWellTrajectoriesLayer } from "../layers/implementations/layers/DrilledWellTrajectoriesLayer/DrilledWellTrajectoriesLayer";
import { ObservedSurfaceLayer } from "../layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationGridLayer } from "../layers/implementations/layers/RealizationGridLayer/RealizationGridLayer";
import { RealizationPolygonsLayer } from "../layers/implementations/layers/RealizationPolygonsLayer/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "../layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "../layers/implementations/layers/StatisticalSurfaceLayer/StatisticalSurfaceLayer";
import { Ensemble } from "../layers/implementations/settings/Ensemble";
import { Realization } from "../layers/implementations/settings/Realization";
import { SurfaceName } from "../layers/implementations/settings/SurfaceName";
import { Group, Item, instanceofGroup } from "../layers/interfaces";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const queryClient = useQueryClient();
    const layerManager = React.useRef<LayerManager>(
        new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient)
    );

    const colorSet = props.workbenchSettings.useColorSet();

    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupBaseTopic.CHILDREN);

    const setLayerManager = useSetAtom(layerManagerAtom);

    React.useEffect(
        function onMountEffect() {
            setLayerManager(layerManager.current);
        },
        [setLayerManager]
    );

    function handleLayerAction(identifier: string, group?: Group) {
        let groupDelegate = layerManager.current.getGroupDelegate();
        if (group) {
            groupDelegate = group.getGroupDelegate();
        }

        switch (identifier) {
            case "view":
                groupDelegate.appendChild(new View("New View", colorSet.getNextColor()));
                return;
            case "observed_surface":
                groupDelegate.appendChild(new ObservedSurfaceLayer());
                return;
            case "statistical_surface":
                groupDelegate.appendChild(new StatisticalSurfaceLayer());
                return;
            case "realization_surface":
                groupDelegate.appendChild(new RealizationSurfaceLayer());
                return;
            case "realization_polygons":
                groupDelegate.appendChild(new RealizationPolygonsLayer());
                return;
            case "drilled_wellbores":
                groupDelegate.appendChild(new DrilledWellTrajectoriesLayer());
                return;
            case "realization_grid":
                groupDelegate.appendChild(new RealizationGridLayer());
                return;
            case "ensemble":
                groupDelegate.prependChild(new SharedSetting(new Ensemble()));
                return;
            case "realization":
                groupDelegate.prependChild(new SharedSetting(new Realization()));
                return;
            case "surface_name":
                groupDelegate.prependChild(new SharedSetting(new SurfaceName()));
                return;
        }
    }

    function checkIfItemMoveAllowed(args: IsMoveAllowedArgs): boolean {
        const movedItem = groupDelegate.findDescendantById(args.movedItemId);
        if (!movedItem) {
            return false;
        }

        const destinationItem = args.destinationId
            ? groupDelegate.findDescendantById(args.destinationId)
            : layerManager.current;

        if (!destinationItem || !instanceofGroup(destinationItem)) {
            return false;
        }

        const numSharedSettings =
            destinationItem.getGroupDelegate().findChildren((item) => {
                return item instanceof SharedSetting;
            }).length ?? 0;

        if (!(movedItem instanceof SharedSetting)) {
            if (args.position < numSharedSettings) {
                return false;
            }
        } else {
            if (args.originId === args.destinationId) {
                if (args.position >= numSharedSettings) {
                    return false;
                }
            } else {
                if (args.position > numSharedSettings) {
                    return false;
                }
            }
        }

        return true;
    }

    function handleItemMoved(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number
    ) {
        const movedItem = groupDelegate.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        let origin = layerManager.current.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = layerManager.current.getGroupDelegate();
        if (destinationId) {
            const candidate = groupDelegate.findDescendantById(destinationId);
            if (candidate && instanceofGroup(candidate)) {
                destination = candidate.getGroupDelegate();
            }
        }

        if (origin === destination) {
            origin.moveChild(movedItem, position);
            return;
        }

        origin.removeChild(movedItem);
        destination.insertChild(movedItem, position);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <div className="flex-grow flex flex-col min-h-0">
                <div className="w-full flex-grow flex flex-col min-h-0">
                    <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                        <div className="flex-grow font-bold text-sm">Layers</div>
                        <LayersActions layersActionGroups={LAYER_ACTIONS} onActionClick={handleLayerAction} />
                    </div>
                    <div className="w-full flex-grow flex flex-col relative h-full">
                        <SortableList
                            onItemMoved={handleItemMoved}
                            isMoveAllowed={checkIfItemMoveAllowed}
                            contentWhenEmpty={
                                <div className="flex -mt-1 justify-center text-sm items-center gap-1 h-40">
                                    Click on <Add fontSize="inherit" /> to add a layer.
                                </div>
                            }
                        >
                            {items.map((item: Item) => makeComponent(item, VIEW_ACTIONS, handleLayerAction))}
                        </SortableList>
                    </div>
                </div>
            </div>
        </div>
    );
}

const LAYER_ACTIONS: LayersActionGroup[] = [
    {
        label: "View",
        children: [
            {
                identifier: "view",
                label: "Add View",
            },
        ],
    },
    {
        label: "Layers",
        children: [
            {
                label: "Surfaces",
                children: [
                    {
                        identifier: "observed_surface",
                        label: "Observed Surface",
                    },
                    {
                        identifier: "statistical_surface",
                        label: "Statistical Surface",
                    },
                    {
                        identifier: "realization_surface",
                        label: "Realization Surface",
                    },
                ],
            },
            {
                label: "Others",
                children: [
                    {
                        identifier: "realization_polygons",
                        label: "Realization Polygons",
                    },
                    {
                        identifier: "drilled_wellbores",
                        label: "Drilled Wellbore Trajectories",
                    },
                    {
                        identifier: "realization_grid",
                        label: "Realization Grid",
                    },
                ],
            },
        ],
    },
    {
        label: "Shared Settings",
        children: [
            {
                identifier: "ensemble",
                label: "Ensemble",
            },
            {
                identifier: "realization",
                label: "Realization",
            },
            {
                identifier: "surface_name",
                label: "Surface Name",
            },
        ],
    },
];

const VIEW_ACTIONS: LayersActionGroup[] = LAYER_ACTIONS.filter((group) => group.label !== "View");
