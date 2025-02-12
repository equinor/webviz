import React from "react";

import { IsMoveAllowedArgs, SortableList } from "@lib/components/SortableList";
import { useElementSize } from "@lib/hooks/useElementSize";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { GroupDelegate, GroupDelegateTopic } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { Group, Item, instanceofGroup } from "@modules/_shared/LayerFramework/interfaces";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { Add } from "@mui/icons-material";

import { LayerManager } from "./LayerManager";

import { LayersActionGroup, LayersActions } from "../../LayersActions";
import { ColorScale } from "../ColorScale/ColorScale";
import { SharedSetting } from "../SharedSetting/SharedSetting";
import { View } from "../View/View";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

export type LayerManagerComponentProps = {
    layerManager: LayerManager;
    additionalHeaderComponents: React.ReactNode;
    layerActions: LayersActionGroup[];
    onLayerAction: (identifier: string, groupDelegate: GroupDelegate) => void;
    isMoveAllowed?: (movedItem: Item, destinationGroup: Group) => boolean;
};

export function LayerManagerComponent(props: LayerManagerComponentProps): React.ReactNode {
    const layerListRef = React.useRef<HTMLDivElement>(null);
    const layerListSize = useElementSize(layerListRef);

    const groupDelegate = props.layerManager.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleLayerAction(identifier: string, group?: Group) {
        let groupDelegate = props.layerManager.getGroupDelegate();
        if (group) {
            groupDelegate = group.getGroupDelegate();
        }

        props.onLayerAction(identifier, groupDelegate);
    }

    function checkIfItemMoveAllowed(args: IsMoveAllowedArgs): boolean {
        const movedItem = groupDelegate.findDescendantById(args.movedItemId);
        if (!movedItem) {
            return false;
        }

        const destinationItem = args.destinationId
            ? groupDelegate.findDescendantById(args.destinationId)
            : props.layerManager;

        if (!destinationItem || !instanceofGroup(destinationItem)) {
            return false;
        }

        if (movedItem instanceof View && destinationItem instanceof View) {
            return false;
        }

        if (props.isMoveAllowed) {
            if (!props.isMoveAllowed(movedItem, destinationItem)) {
                return false;
            }
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

        let origin = props.layerManager.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = props.layerManager.getGroupDelegate();
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
        <div className="flex-grow flex flex-col min-h-0">
            <div className="w-full flex-grow flex flex-col min-h-0" ref={layerListRef}>
                <div className="flex bg-slate-100 h-12 p-2 items-center border-b border-gray-300 gap-2">
                    <div className="flex-grow font-bold text-sm">Layers</div>
                    <LayersActions layersActionGroups={props.layerActions} onActionClick={handleLayerAction} />
                    <ExpandCollapseAllButton group={props.layerManager} />
                    {props.additionalHeaderComponents}
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
                        {items.map((item: Item) =>
                            makeSortableListItemComponent(item, props.layerActions, handleLayerAction)
                        )}
                    </SortableList>
                </div>
            </div>
        </div>
    );
}
