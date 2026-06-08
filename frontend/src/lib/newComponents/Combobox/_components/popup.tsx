import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { PortalContainerContext } from "@lib/newComponents/_shared/contexts/portalContainerContext";

export type ComboBoxPopupProps = {
    children?: React.ReactNode;
};

export function ComboBoxPopup(props: ComboBoxPopupProps): React.ReactNode {
    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <ComboboxBase.Portal container={portalContainer}>
            <ComboboxBase.Positioner className="z-tooltip outline-0" sideOffset={4}>
                <ComboboxBase.Popup className="bg-floating shadow-elevation-floating box-border max-h-96 max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) rounded transition-transform data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                    {props.children}
                </ComboboxBase.Popup>
            </ComboboxBase.Positioner>
        </ComboboxBase.Portal>
    );
}
