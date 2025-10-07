import React from "react";

import { BugReport } from "@mui/icons-material";

import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Tooltip } from "@lib/components/Tooltip";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
                    "absolute bottom-2 shadow-sm left-1.5 z-50 m-2 p-2 rounded-full flex items-center justify-center w-8 h-8 bg-gray-800 text-white text-m cursor-pointer",
                    {
                        "bg-green-700 hover: hover:bg-green-600": devToolsVisible,
                        "bg-gray-800 hover:bg-gray-700": !devToolsVisible,
                    },
                )}
                onClick={() => {
                    setDevToolsVisible(!devToolsVisible);
                }}
            >
                <BugReport fontSize="inherit" />
            </div>
        </Tooltip>
    );
};
