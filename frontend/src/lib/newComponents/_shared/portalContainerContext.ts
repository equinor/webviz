import React from "react";

/**
 * Provides a container element for portal-based components (Combobox, Popover, ContextMenu, etc.)
 * so their popups render inside a specific DOM subtree rather than document.body.
 *
 * This is primarily used by Dialog.Body to prevent focus-trap conflicts between a modal
 * dialog and any portal-based component rendered inside it.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(null);
