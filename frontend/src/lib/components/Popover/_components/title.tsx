import React from "react";

import { Popover as PopoverBase } from "@base-ui/react";
import { Close } from "@mui/icons-material";

import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { Button } from "@lib/components/Button";
import { Separator } from "@lib/components/Separator";
import { Typography } from "@lib/components/Typography";

export type TitleProps = {
    /** Font size of the title text. @default "md" */
    fontSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    /** When true, hides the close button in the top-right corner. @default false */
    hideCloseButton?: boolean;
    /** When true, the separator does not extend beyond the padding area. @default false */
    containedSeparator?: boolean;
    children: React.ReactNode;
};

const DEFAULT_PROPS = {
    fontSize: "md",
} satisfies Partial<TitleProps>;

export function Title(props: TitleProps): React.ReactNode {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    return (
        <>
            <div className="flex w-full items-center justify-between">
                <PopoverBase.Title render={<Typography as="h2" family="header" size={defaultedProps.fontSize} />}>
                    {props.children}
                </PopoverBase.Title>

                {!defaultedProps.hideCloseButton && (
                    <PopoverBase.Close render={<Button variant="ghost" round iconOnly size="small" />}>
                        <Close fontSize="inherit" />
                    </PopoverBase.Close>
                )}
            </div>

            <Separator layoutClassName={!props.containedSeparator ? "-mx-sm" : ""} />
        </>
    );
}
