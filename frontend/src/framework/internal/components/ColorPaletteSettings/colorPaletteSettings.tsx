import React from "react";

import { useStoreState } from "@framework/StateStore";
import { ColorPaletteType, DrawerContent, Workbench } from "@framework/Workbench";
import { ColorPaletteSelector } from "@framework/components/ColorPaletteSelector";
import { Label } from "@lib/components/Label";

import { Drawer } from "../Drawer";

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
};

export const ColorPaletteSettings: React.FC<ColorPaletteSettingsProps> = (props) => {
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");

    const handleDrawerClose = () => {
        setDrawerContent(DrawerContent.None);
    };

    const colorPalettes = props.workbench.getColorPalettes();

    return (
        <Drawer
            title="Color palette settings"
            visible={drawerContent === DrawerContent.ColorPaletteSettings}
            onClose={handleDrawerClose}
        >
            <div className="flex flex-col gap-2">
                <Label text="Categorical colors">
                    <ColorPaletteSelector colorPalettes={colorPalettes[ColorPaletteType.Categorical]} />
                </Label>
                <Label text="Continuous colors">
                    <ColorPaletteSelector colorPalettes={colorPalettes[ColorPaletteType.Continuous]} continuous />
                </Label>
            </div>
        </Drawer>
    );
};
