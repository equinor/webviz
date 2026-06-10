import type React from "react";

import { mergeProps, useRender } from "@base-ui/react";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { defaults } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../contexts/componentSizeContext";
import type { SelectableSize } from "../utils/size";

export type BrowseButtonsProps = {
    prevTitle?: string;
    nextTitle?: string;
    disabled?: boolean;
    size: SelectableSize;
    renderPrev?: ArrowButtonProps["render"];
    renderNext?: ArrowButtonProps["render"];
    onClickPrev?: () => void;
    onClickNext?: () => void;
};

const DEFAULT_PROPS = {
    prevTitle: "Previous option",
    nextTitle: "Next option",
} satisfies Partial<BrowseButtonsProps>;

export function BrowseButtons(props: BrowseButtonsProps): React.ReactNode {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);
    const flowHorizontal = defaultedProps.size === "small";

    return (
        <div className={resolveClassNames("flex h-full items-center", flowHorizontal ? "flex-row" : "flex-col")}>
            <ArrowButton
                data-horizontal={flowHorizontal ? "" : undefined}
                className="not-data-horizontal:rounded-t-xs data-horizontal:rounded-l-xs"
                title={defaultedProps.prevTitle}
                disabled={defaultedProps.disabled}
                size={props.size}
                onClick={defaultedProps.onClickNext}
                render={props.renderPrev}
            >
                <KeyboardArrowUp />
            </ArrowButton>
            <ArrowButton
                data-horizontal={flowHorizontal ? "" : undefined}
                className="not-data-horizontal:rounded-b-xs data-horizontal:rounded-r-xs"
                title={defaultedProps.nextTitle}
                disabled={defaultedProps.disabled}
                size={props.size}
                onClick={defaultedProps.onClickPrev}
                render={props.renderNext}
            >
                <KeyboardArrowDown />
            </ArrowButton>
        </div>
    );
}

type ArrowButtonProps = useRender.ComponentProps<"button"> & {
    size?: SelectableSize;
};

function ArrowButton(props: ArrowButtonProps) {
    const { render, ...otherProps } = props;

    const size = useComponentSize(props);
    const textSizeClass = {
        small: " text-body-xs",
        default: " text-body-xs",
        large: " text-body-sm",
    }[size];

    const className = `focusable bg-neutral not-disabled:hover:bg-neutral-hover active:bg-neutral-active px-4xs flex flex-1 items-center justify-center focus:outline-0 ${textSizeClass}`;

    const element = useRender({
        defaultTagName: "button",
        render: render,
        props: mergeProps<"button">(
            {
                "aria-label": props["aria-label"] ?? props.title,
                className: className,
            },
            otherProps,
        ),
    });

    return element;
}
