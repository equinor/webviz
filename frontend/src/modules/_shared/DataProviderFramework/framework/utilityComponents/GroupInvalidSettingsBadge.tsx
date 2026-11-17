import React from "react";

import { Block } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

import { useDescendantsWithInvalidSettings } from "../../hooks/useDescendantsWithInvalidSettings";
import { instanceofItemGroup, type Item, type ItemGroup } from "../../interfacesAndTypes/entities";
import type { DataProvider } from "../DataProvider/DataProvider";

export type GroupInvalidSettingsBadgeProps = {
    group: ItemGroup;
};

export function GroupInvalidSettingsBadge(props: GroupInvalidSettingsBadgeProps) {
    const { group } = props;
    const descendantsWithInvalidSettings = useDescendantsWithInvalidSettings(group);

    const handleShowInvalidSettings = React.useCallback(
        function handleShowInvalidSettings() {
            function hasInvalidSettingsInSubtree(item: Item): boolean {
                if (descendantsWithInvalidSettings.includes(item as DataProvider<any, any>)) {
                    return true;
                }
                if (instanceofItemGroup(item)) {
                    return item.getGroupDelegate().getChildren().some(hasInvalidSettingsInSubtree);
                }
                return false;
            }

            group.getItemDelegate().setExpanded(true);
            for (const item of group.getGroupDelegate().getDescendantItems(hasInvalidSettingsInSubtree)) {
                item.getItemDelegate().setExpanded(true);
            }
        },
        [group, descendantsWithInvalidSettings],
    );

    if (descendantsWithInvalidSettings.length === 0) {
        return null;
    }

    const names = descendantsWithInvalidSettings.map((provider) => provider.getItemDelegate().getName());
    const tooltip = `Invalid settings in: ${names.join(", ")}.\nClick to show the settings.`;

    return (
        <Tooltip content={tooltip} side="bottom">
            <Button
                onClick={handleShowInvalidSettings}
                variant="ghost"
                tone="danger"
                size="small"
                iconOnly
                aria-label="Invalid settings - show the settings"
            >
                <Block style={{ fontSize: 16 }} />
            </Button>
        </Tooltip>
    );
}
