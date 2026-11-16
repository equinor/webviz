import React from "react";

export type TagProps = {
    /** The text content displayed inside the tag. */
    label: string;
    /** Accessible tooltip text shown on hover. */
    title?: string;
};

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(function Tag(props: TagProps, ref) {
    return (
        <span
            className="px-3xs py-3xs bg-canvas text-body-xs text-neutral-subtle mx-2xs my-2xs inline-flex items-center rounded-sm border font-mono"
            title={props.title}
            ref={ref}
        >
            {props.label}
        </span>
    );
});
