import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { instanceofItemGroup, type Item, type ItemGroup } from "../../interfacesAndTypes/entities";
import { isErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";

import { ErrorBadge } from "./ErrorBadge";

export type GroupErrorBadgeProps = {
    group: ItemGroup;
};

export function GroupErrorBadge(props: GroupErrorBadgeProps) {
    const treeRevisionNumber = usePublishSubscribeTopicValue(
        props.group.getGroupDelegate(),
        GroupDelegateTopic.TREE_REVISION_NUMBER,
    );

    const deserializationErrors = usePublishSubscribeTopicValue(
        props.group.getItemDelegate(),
        ItemDelegateTopic.DESERIALIZATION_ERRORS,
    );

    const numDescendantErrors = React.useMemo(
        () => {
            let descendantErrors = 0;
            const descendants = props.group
                .getGroupDelegate()
                .getDescendantItems(isErrorPlaceholderOrHasDeserializationErrors);
            for (const descendant of descendants) {
                if (isErrorPlaceholder(descendant)) {
                    descendantErrors += 1;
                } else {
                    descendantErrors += descendant.getItemDelegate().getDeserializationErrors().length;
                }
            }
            return descendantErrors;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.group.getGroupDelegate(), treeRevisionNumber],
    );

    const numTotalErrors = deserializationErrors.length + numDescendantErrors;

    const handleOpenAllDescendantsWithErrors = React.useCallback(
        function handleOpenAllDescendantsWithErrors() {
            function isErrorPlaceholderOrHasErrorPlaceholderDescendant(item: Item): boolean {
                if (isErrorPlaceholderOrHasDeserializationErrors(item)) {
                    return true;
                }
                if (instanceofItemGroup(item)) {
                    const groupDelegate = item.getGroupDelegate();
                    const descendants = groupDelegate.getDescendantItems(() => true);
                    return descendants.some(isErrorPlaceholderOrHasDeserializationErrors);
                }
                return false;
            }

            props.group.getItemDelegate().setExpanded(true);

            const descendantsWithErrors = props.group
                .getGroupDelegate()
                .getDescendantItems(isErrorPlaceholderOrHasErrorPlaceholderDescendant);
            for (const descendant of descendantsWithErrors) {
                descendant.getItemDelegate().setExpanded(true);
            }
        },
        [props.group],
    );

    if (numTotalErrors === 0 || (props.group.getItemDelegate().isExpanded() && deserializationErrors.length === 0)) {
        return null;
    }

    return <ErrorBadge numErrors={numTotalErrors} onClick={handleOpenAllDescendantsWithErrors} />;
}

function isErrorPlaceholderOrHasDeserializationErrors(item: Item): boolean {
    if (isErrorPlaceholder(item)) {
        return true;
    }
    if (item.getItemDelegate().getDeserializationErrors().length > 0) {
        return true;
    }
    return false;
}
