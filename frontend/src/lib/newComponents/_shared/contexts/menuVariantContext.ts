import React from "react";

export type MenuVariant = "menu" | "contextMenu" | "combobox";

/** A context to be used alongside `./components/menus/**` reusable components to specify what base component to use */
export const MenuVariantContext = React.createContext<MenuVariant | null>(null);

export function useMenuVariant(): MenuVariant {
    const context = React.useContext(MenuVariantContext);

    if (!context) throw new Error("useMenuVariant must be used within a MenuVariantContext.Provider");

    return context;
}
