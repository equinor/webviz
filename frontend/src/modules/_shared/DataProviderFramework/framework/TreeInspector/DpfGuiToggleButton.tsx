import type React from "react";
import { useSyncExternalStore } from "react";

import { AccountTree, PictureInPictureAlt, VerticalSplit, ViewList, ViewStream } from "@mui/icons-material";

import type {
    DataProviderFrameworkGui,
    DataProviderFrameworkSettingsPlacement,
    GuiMessageBroker,
} from "@framework/GuiMessageBroker";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Button } from "@lib/components/Button";
import { MenuCompositions } from "@lib/components/Menu/compositions";
import { Tooltip } from "@lib/components/Tooltip";

function subscribeToNothing(): () => void {
    return () => {};
}

/** The chosen DPF GUI - always "classic" when there is no broker (e.g. outside the workbench). */
export function useDataProviderFrameworkGui(guiMessageBroker: GuiMessageBroker | null): DataProviderFrameworkGui {
    return useSyncExternalStore(
        guiMessageBroker
            ? guiMessageBroker.makeStateSubscriberFunction(GuiState.DataProviderFrameworkGui)
            : subscribeToNothing,
        guiMessageBroker
            ? guiMessageBroker.makeStateSnapshotGetter(GuiState.DataProviderFrameworkGui)
            : () => "classic" as const,
    );
}

/** Where the tree inspector shows the settings - always "below" when there is no broker. */
export function useDataProviderFrameworkSettingsPlacement(
    guiMessageBroker: GuiMessageBroker | null,
): DataProviderFrameworkSettingsPlacement {
    return useSyncExternalStore(
        guiMessageBroker
            ? guiMessageBroker.makeStateSubscriberFunction(GuiState.DataProviderFrameworkSettingsPlacement)
            : subscribeToNothing,
        guiMessageBroker
            ? guiMessageBroker.makeStateSnapshotGetter(GuiState.DataProviderFrameworkSettingsPlacement)
            : () => "below" as const,
    );
}

const PLACEMENT_OPTIONS: { value: DataProviderFrameworkSettingsPlacement; label: string; icon: React.ReactNode }[] = [
    { value: "below", label: "Settings below the tree", icon: <ViewStream fontSize="inherit" /> },
    { value: "beside", label: "Settings next to the tree", icon: <VerticalSplit fontSize="inherit" /> },
    {
        value: "floating",
        label: "Settings floating beside the sidebar",
        icon: <PictureInPictureAlt fontSize="inherit" />,
    },
];

export type DpfSettingsPlacementMenuProps = {
    guiMessageBroker: GuiMessageBroker;
};

export function DpfSettingsPlacementMenu(props: DpfSettingsPlacementMenuProps): React.ReactNode {
    const [placement, setPlacement] = useGuiState(
        props.guiMessageBroker,
        GuiState.DataProviderFrameworkSettingsPlacement,
    );
    const current = PLACEMENT_OPTIONS.find((option) => option.value === placement) ?? PLACEMENT_OPTIONS[0];

    const menuItems = PLACEMENT_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        icon: option.icon,
        checked: option.value === placement,
    }));

    function handleActionClicked(id: string) {
        const option = PLACEMENT_OPTIONS.find((candidate) => candidate.value === id);
        if (option) {
            setPlacement(option.value);
        }
    }

    return (
        <MenuCompositions.Default
            side="bottom"
            align="end"
            itemSize="small"
            items={menuItems}
            onActionClicked={handleActionClicked}
        >
            <Button
                variant="ghost"
                tone="neutral"
                size="small"
                iconOnly
                aria-label={`Settings placement: ${current.label}`}
                title={`Settings placement: ${current.label}`}
            >
                {current.icon}
            </Button>
        </MenuCompositions.Default>
    );
}

export type DpfGuiToggleButtonProps = {
    guiMessageBroker: GuiMessageBroker;
};

export function DpfGuiToggleButton(props: DpfGuiToggleButtonProps): React.ReactNode {
    const [gui, setGui] = useGuiState(props.guiMessageBroker, GuiState.DataProviderFrameworkGui);
    const isTreeInspector = gui === "treeInspector";
    const label = isTreeInspector ? "Switch to classic layer list" : "Switch to tree view + inspector (experimental)";

    return (
        <Tooltip content={label} side="bottom">
            <Button
                variant="ghost"
                tone="neutral"
                size="small"
                iconOnly
                aria-label={label}
                onClick={() => setGui(isTreeInspector ? "classic" : "treeInspector")}
            >
                {isTreeInspector ? <ViewList fontSize="inherit" /> : <AccountTree fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
