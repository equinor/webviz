import React from "react";

import type { GuiMessageBroker } from "./GuiMessageBroker";

export const GuiMessageBrokerContext = React.createContext<GuiMessageBroker | null>(null);

/**
 * Returns the workbench's GuiMessageBroker, or null when rendered outside the workbench (e.g. in tests or stories).
 */
export function useGuiMessageBroker(): GuiMessageBroker | null {
    return React.useContext(GuiMessageBrokerContext);
}
