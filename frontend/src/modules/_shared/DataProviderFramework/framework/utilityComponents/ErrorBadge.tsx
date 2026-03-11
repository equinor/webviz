import React from "react";

import { Warning } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { instanceofItemGroup, type Item, type ItemGroup } from "../../interfacesAndTypes/entities";
import { isErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";

export type ErrorBadgeProps = {
    group: ItemGroup;
};

export function ErrorBadge(props: ErrorBadgeProps) {
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

    return (
        <Tooltip title={numDescendantErrors > 1 ? `${numDescendantErrors} errors` : "1 error"}>
            <div
                className="bg-red-200 rounded px-2 py-1 flex gap-2 items-center text-red-900 h-6 border border-red-400 whitespace-nowrap cursor-pointer"
                onClick={handleOpenAllDescendantsWithErrors}
            >
                <Warning color="error" fontSize="small" />
                <span className="text-xs leading-0">{numTotalErrors}</span>
            </div>
        </Tooltip>
    );
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
