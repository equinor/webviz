import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";
import { omit } from "lodash-es";

import type { SizeName } from "@lib/utils/componentSize";

export const MenuTextSizeContext = React.createContext<SizeName>("medium");

export type MenuRootProps = BaseMenu.Root.Props & {
    itemSize?: SizeName;
};

export function MenuRoot(props: MenuRootProps): React.ReactNode {
    const itemSizeOrDefault = props.itemSize ?? "medium";

    return (
        <MenuTextSizeContext.Provider value={itemSizeOrDefault}>
            <BaseMenu.Root {...omit(props, "textSize")} />
        </MenuTextSizeContext.Provider>
    );
}
