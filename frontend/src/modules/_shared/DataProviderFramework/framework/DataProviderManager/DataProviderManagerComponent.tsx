import React from "react";

import { Add } from "@mui/icons-material";

import { SortableList } from "@lib/newComponents/SortableList";
import type { IsMoveAllowedArgs } from "@lib/newComponents/SortableList";
import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { View } from "../../groups/implementations/View";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { instanceofItemGroup } from "../../interfacesAndTypes/entities";
import { SharedSetting } from "../SharedSetting/SharedSetting";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { DataProviderManager } from "./DataProviderManager";

export type DataProviderManagerComponentProps = {
    title: string;
    dataProviderManager: DataProviderManager;
    additionalHeaderComponents: React.ReactNode;
    groupActions: ActionGroup[] | ((group: ItemGroup) => ActionGroup[]);
    onAction: (identifier: string, groupDelegate: GroupDelegate) => void;
    isMoveAllowed?: (movedItem: Item, destinationGroup: ItemGroup) => boolean;
    emptyContentPlaceholder?: React.ReactNode;
};

export function DataProviderManagerComponent(props: DataProviderManagerComponentProps): React.ReactNode {
    const { groupActions } = props;

    const listRef = React.useRef<HTMLDivElement>(null);
    const listSize = useElementSize(listRef);

    const groupDelegate = props.dataProviderManager.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleActionClick(identifier: string, group?: ItemGroup) {
        let groupDelegate = props.dataProviderManager.getGroupDelegate();
        if (group) {
            groupDelegate = group.getGroupDelegate();
        }

        props.onAction(identifier, groupDelegate);
    }

    function checkIfItemMoveAllowed(args: IsMoveAllowedArgs): boolean {
        const movedItem = groupDelegate.findDescendantById(args.movedItemId);
        if (!movedItem) {
            return false;
        }

        const destinationItem = args.destinationId
            ? groupDelegate.findDescendantById(args.destinationId)
            : props.dataProviderManager;

        if (!destinationItem || !instanceofItemGroup(destinationItem)) {
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
        position: number,
        originId: string | null,
        destinationId: string | null,
    ) {
        const movedItem = groupDelegate.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        let origin = props.dataProviderManager.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofItemGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = props.dataProviderManager.getGroupDelegate();
        if (destinationId) {
            const candidate = groupDelegate.findDescendantById(destinationId);
            if (candidate && instanceofItemGroup(candidate)) {
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

    const actions = React.useMemo(() => {
        if (typeof groupActions === "function") {
            return groupActions(props.dataProviderManager);
        }
        return groupActions;
    }, [props.dataProviderManager, groupActions]);

    const makeActionsForGroup = (group: ItemGroup) => {
        if (typeof groupActions === "function") {
            return groupActions(group);
        }
        return groupActions;
    };

    return (
        <div className="flex min-h-0 grow flex-col">
            <div className="flex min-h-0 w-full grow flex-col" ref={listRef}>
                <div className="gap-x-2xs border-neutral-subtle bg-neutral px-3xs pl-xs py-2xs flex items-center border-b">
                    <div className="font-bolder grow text-sm">{props.title}</div>
                    <Actions actionGroups={actions} onActionClick={handleActionClick} />
                    <ExpandCollapseAllButton group={props.dataProviderManager} />
                    {props.additionalHeaderComponents}
                </div>
                <div
                    className="relative flex w-full grow flex-col"
                    style={{ height: listSize.height - convertRemToPixels(12) }}
                >
                    <SortableList
                        onItemMoved={handleItemMoved}
                        isMoveAllowed={checkIfItemMoveAllowed}
                        className="h-full"
                    >
                        <SortableList.Content>
                            <SortableList.ScrollContainer>
                                <div className="bg-canvas relative h-full min-h-0 grow overflow-auto">
                                    {items.length === 0 && (
                                        <div className="gap-x-3xs -mt-3xs text-body-sm flex h-full items-center justify-center">
                                            {props.emptyContentPlaceholder ?? (
                                                <>
                                                    Click on <Add fontSize="inherit" /> to add an item.
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {items.map((item: Item) =>
                                        makeSortableListItemComponent(item, makeActionsForGroup, handleActionClick),
                                    )}
                                </div>
                            </SortableList.ScrollContainer>
                        </SortableList.Content>
                    </SortableList>
                </div>
            </div>
        </div>
    );
}
