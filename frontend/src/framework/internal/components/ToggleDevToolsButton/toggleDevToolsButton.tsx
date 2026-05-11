import React from "react";

import { BugReport } from "@mui/icons-material";

import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Tooltip } from "@lib/components/Tooltip";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button } from "@lib/newComponents/Button";
import { Toggle } from "@lib/newComponents/Toggle";

export type ToggleDevToolsButtonProps = {
    guiMessageBroker: GuiMessageBroker;
};

export const ToggleDevToolsButton: React.FC<ToggleDevToolsButtonProps> = (props) => {
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
        <Tooltip title={devToolsVisible ? "Hide dev tools" : "Show dev tools"} placement="right">
            <div
                className={resolveClassNames(
                    "text-m absolute right-1.5 bottom-16 z-50 m-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-800 p-2 text-white shadow-sm",
                )}
            >
                <Toggle.Button
                    pressed={devToolsVisible}
                    buttonProps={{ size: "small", tone: "accent" }}
                    onPressedChange={() => setDevToolsVisible(!devToolsVisible)}
                >
                    <BugReport fontSize="inherit" />
                </Toggle.Button>
            </div>
        </Tooltip>
    );
};
