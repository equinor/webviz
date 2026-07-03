import React from "react";

import { DeveloperMode } from "@mui/icons-material";

import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Toggle } from "@lib/components/Toggle";
import { Tooltip } from "@lib/components/Tooltip";
import { isDevMode } from "@lib/utils/devMode";

export type ToggleDevToolsButtonProps = {
    guiMessageBroker: GuiMessageBroker;
};

export function ToggleDevToolsButton(props: ToggleDevToolsButtonProps): React.ReactNode {
    const [devToolsVisible, setDevToolsVisible] = useGuiState(props.guiMessageBroker, GuiState.DevToolsVisible);

    React.useEffect(() => {
        if (!devToolsVisible) {
            document.querySelector(".tsqd-parent-container")?.classList.add("hidden");
        } else {
            document.querySelector(".tsqd-parent-container")?.classList.remove("hidden");
        }
    }, [devToolsVisible]);

    if (!isDevMode()) {
        return null;
    }

    return (
        <Tooltip content={devToolsVisible ? "Hide dev tools" : "Show dev tools"} side="bottom">
            <span>
                <Toggle.Button
                    pressed={devToolsVisible}
                    buttonProps={{ tone: "accent", iconOnly: true }}
                    onPressedChange={() => setDevToolsVisible(!devToolsVisible)}
                >
                    <DeveloperMode fontSize="inherit" />
                </Toggle.Button>
            </span>
        </Tooltip>
    );
}
