import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { MenuVariantContext } from "@lib/components/_shared/contexts/menuVariantContext";
import { PortalContainerContext } from "@lib/components/_shared/contexts/portalContainerContext";
import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

export type ComboBoxPopupProps = {
    itemSize: SelectableSize;
    children?: React.ReactNode;
};

export function ComboBoxPopup(props: ComboBoxPopupProps): React.ReactNode {
    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <ComboboxBase.Portal container={portalContainer}>
            <ComboboxBase.Positioner className="z-tooltip outline-0" sideOffset={4}>
                <Typography
                    as={ComboboxBase.Popup}
                    size={getTextSizeForSelectableSize(props.itemSize)}
                    layoutClassName="menu__popup max-h-96 max-w-(--available-width) min-w-(--anchor-width) "
                >
                    <MenuVariantContext.Provider value="combobox">
                        <ComponentSizeContext.Provider value={props.itemSize}>
                            {props.children}
                        </ComponentSizeContext.Provider>
                    </MenuVariantContext.Provider>
                </Typography>
            </ComboboxBase.Positioner>
        </ComboboxBase.Portal>
    );
}
