import type React from "react";

import { Popover as PopoverBase } from "@base-ui/react";
import { Close } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { Separator } from "@lib/newComponents/Separator";
import { Typography } from "@lib/newComponents/Typography";

export type TitleProps = {
    fontSize?: "xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    hideCloseButton?: boolean;
    children: React.ReactNode;
};

const DEFAULT_PROPS = {
    fontSize: "md",
} satisfies Partial<TitleProps>;

export function Title(props: TitleProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    return (
        <>
            <div className="flex w-full items-center justify-between">
                <PopoverBase.Title render={<Typography as="h2" family="header" size={defaultedProps.fontSize} />}>
                    {props.children}
                </PopoverBase.Title>

                {!defaultedProps.hideCloseButton && (
                    <PopoverBase.Close render={<Button variant="text" round iconOnly size="small" />}>
                        <Close fontSize="inherit" />
                    </PopoverBase.Close>
                )}
            </div>

            <Separator className="-mx-horizontal-sm" />
        </>
    );
}
