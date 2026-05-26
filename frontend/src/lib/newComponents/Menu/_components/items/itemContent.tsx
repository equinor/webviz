import type React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/size";
import { Typography } from "@lib/newComponents/Typography";

export type MenuItemContentProps = {
    /** An icon shown on the left side of the text/description */
    icon?: React.ReactNode;
    /** The main text of the item. For more complex content, use `children` */
    text?: string;
    /** A descriptive text shown below the main content */
    description?: string;
    /* The main content of the item. Overrides the `text` prop */
    children?: React.ReactNode;
};

export function ItemContent(props: MenuItemContentProps) {
    const size = useComponentSize();

    if (props.description) {
        return (
            <>
                {props.icon && <span>{props.icon}</span>}
                <div>
                    <Typography as="p" size={getTextSizeForSelectableSize(size)} weight="bolder">
                        {props.children ?? props.text}
                    </Typography>
                    <Typography as="p" size={getNextTextSize(getTextSizeForSelectableSize(size), -1)} weight="lighter">
                        {props.description}
                    </Typography>
                </div>
            </>
        );
    }

    return (
        <>
            {props.icon}
            {props.children ?? props.text}
        </>
    );
}
