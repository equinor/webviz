import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, fault, grid_layer, settings, surface_layer, wellbore } from "@equinor/eds-icons";
import { ModuleSettingsProps } from "@framework/Module";
import { IsMoveAllowedArgs, SortableList } from "@lib/components/SortableList";
import { useElementSize } from "@lib/hooks/useElementSize";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Add, Panorama, SettingsApplications } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useSetAtom } from "jotai";

import { layerManagerAtom } from "./atoms/baseAtoms";

import { ColorScale } from "../layers/ColorScale";
import { LayerManager } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { SettingsGroup } from "../layers/SettingsGroup";
import { SharedSetting } from "../layers/SharedSetting";
import { View } from "../layers/View";
import { ExpandCollapseAllButton } from "../layers/components/ExpandCollapseAllButton";
import { LayersActionGroup, LayersActions } from "../layers/components/LayersActions";
import { makeComponent } from "../layers/components/utils";
import { GroupDelegateTopic } from "../layers/delegates/GroupDelegate";
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
    const layerListRef = React.useRef<HTMLDivElement>(null);
    const layerListSize = useElementSize(layerListRef);

    const queryClient = useQueryClient();
    const layerManager = React.useRef<LayerManager>(
        new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient)
    );

    const colorSet = props.workbenchSettings.useColorSet();

    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

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

        const numSharedSettings = groupDelegate.findChildren((item) => {
            return item instanceof SharedSetting;
        }).length;

        const numViews = groupDelegate.getDescendantItems((item) => item instanceof View).length;

        switch (identifier) {
            case "view":
                groupDelegate.appendChild(
                    new View(numViews > 0 ? `View (${numViews})` : "View", colorSet.getNextColor())
                );
                return;
            case "settings-group":
                groupDelegate.insertChild(new SettingsGroup("Settings group"), numSharedSettings);
                return;
            case "color-scale":
                groupDelegate.prependChild(new ColorScale("Color scale"));
                return;
            case "observed_surface":
                groupDelegate.insertChild(new ObservedSurfaceLayer(), numSharedSettings);
                return;
            case "statistical_surface":
                groupDelegate.insertChild(new StatisticalSurfaceLayer(), numSharedSettings);
                return;
            case "realization_surface":
                groupDelegate.insertChild(new RealizationSurfaceLayer(), numSharedSettings);
                return;
            case "realization_polygons":
                groupDelegate.insertChild(new RealizationPolygonsLayer(), numSharedSettings);
                return;
            case "drilled_wellbores":
                groupDelegate.insertChild(new DrilledWellTrajectoriesLayer(), numSharedSettings);
                return;
            case "realization_grid":
                groupDelegate.insertChild(new RealizationGridLayer(), numSharedSettings);
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

        const numSharedSettingsAndColorScales =
            destinationItem.getGroupDelegate().findChildren((item) => {
                return item instanceof SharedSetting || item instanceof ColorScale;
            }).length ?? 0;

        if (!(movedItem instanceof SharedSetting || movedItem instanceof ColorScale)) {
            if (args.position < numSharedSettingsAndColorScales) {
                return false;
            }
        } else {
            if (args.originId === args.destinationId) {
                if (args.position >= numSharedSettingsAndColorScales) {
                    return false;
                }
            } else {
                if (args.position > numSharedSettingsAndColorScales) {
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

    const hasView = groupDelegate.getDescendantItems((item) => item instanceof View).length > 0;
    const adjustedLayerActions = hasView ? LAYER_ACTIONS : INITIAL_LAYER_ACTIONS;

    return (
        <div className="h-full flex flex-col gap-1">
            <div className="flex-grow flex flex-col min-h-0">
                <div className="w-full flex-grow flex flex-col min-h-0" ref={layerListRef}>
                    <div className="flex bg-slate-100 h-12 p-2 items-center border-b border-gray-300 gap-2">
                        <div className="flex-grow font-bold text-sm">Layers</div>
                        {layerManager && <ExpandCollapseAllButton group={layerManager.current} />}
                        <LayersActions layersActionGroups={adjustedLayerActions} onActionClick={handleLayerAction} />
                    </div>
                    <div
                        className="w-full flex-grow flex flex-col relative"
                        style={{ height: layerListSize.height - convertRemToPixels(12) }}
                    >
                        <SortableList
                            onItemMoved={handleItemMoved}
                            isMoveAllowed={checkIfItemMoveAllowed}
                            contentWhenEmpty={
                                <div className="flex -mt-1 justify-center text-sm items-center gap-1 h-40">
                                    Click on <Add fontSize="inherit" /> to add a layer.
                                </div>
                            }
                        >
                            {items.map((item: Item) => makeComponent(item, LAYER_ACTIONS, handleLayerAction))}
                        </SortableList>
                    </div>
                </div>
            </div>
        </div>
    );
}

const INITIAL_LAYER_ACTIONS: LayersActionGroup[] = [
    {
        label: "Groups",
        children: [
            {
                identifier: "view",
                icon: <Panorama fontSize="small" />,
                label: "View",
            },
            {
                identifier: "settings-group",
                icon: <SettingsApplications fontSize="small" />,
                label: "Settings group",
            },
        ],
    },
];

const LAYER_ACTIONS: LayersActionGroup[] = [
    {
        label: "Groups",
        children: [
            {
                identifier: "view",
                icon: <Panorama fontSize="small" />,
                label: "View",
            },
            {
                identifier: "settings-group",
                icon: <SettingsApplications fontSize="small" />,
                label: "Settings group",
            },
        ],
    },
    {
        label: "Utilities",
        children: [
            {
                identifier: "color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Color scale",
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
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Observed Surface",
                    },
                    {
                        identifier: "statistical_surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Statistical Surface",
                    },
                    {
                        identifier: "realization_surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Realization Surface",
                    },
                ],
            },
            {
                label: "Others",
                children: [
                    {
                        identifier: "realization_polygons",
                        icon: <Icon data={fault} fontSize="small" />,
                        label: "Realization Polygons",
                    },
                    {
                        identifier: "drilled_wellbores",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Drilled Wellbore Trajectories",
                    },
                    {
                        identifier: "realization_grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
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
                icon: <Icon data={settings} fontSize="small" />,
                label: "Ensemble",
            },
            {
                identifier: "realization",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Realization",
            },
            {
                identifier: "surface_name",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Surface Name",
            },
        ],
    },
];
