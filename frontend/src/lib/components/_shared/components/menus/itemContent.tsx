import type React from "react";

import { mergeProps, useRender } from "@base-ui/react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

export type MenuItemContentProps = {
    /**
     * The item's color tone
     * @default "neutral"
     */
    tone?: "neutral" | "danger" | "warning";
    /** An icon shown on the left side of the text/description */
    icon?: React.ReactNode;
    /** The main text of the item. For more complex content, use `children` */
    text?: string;
    /** A descriptive text shown below the main content */
    description?: string;
    /* The main content of the item. Overrides the `text` prop */
    children?: React.ReactNode;
};

type MenuItemContentPropsWithRender = useRender.ComponentProps<"div"> & MenuItemContentProps;

export function ItemContent(props: MenuItemContentPropsWithRender) {
    const { render, tone, icon, text, description, children, ...otherProps } = props;

    const size = useComponentSize();

    function makeContent() {
        if (description) {
            return (
                <>
                    {icon && <span>{icon}</span>}
                    <div>
                        <Typography as="p" size={getTextSizeForSelectableSize(size)} weight="bolder">
                            {children ?? text}
                        </Typography>
                        <Typography
                            as="p"
                            size={getNextTextSize(getTextSizeForSelectableSize(size), -1)}
                            weight="lighter"
                            layoutClassName="max-w-sm"
                        >
                            {description}
                        </Typography>
                    </div>
                </>
            );
        }
        return (
            <>
                {icon}
                {children ?? text}
            </>
        );
    }

    return useRender({
        defaultTagName: "div",
        render: render,
        props: mergeProps(
            {
                "data-tone": tone ?? "neutral",
                children: makeContent(),
            },
            otherProps,
        ),
    });
}
