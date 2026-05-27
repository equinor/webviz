import type React from "react";

export type TagProps = {
    label: string;
    title?: string;
};

export const Tag: React.FC<TagProps> = (props) => {
    return (
        <span
            className="px-horizontal-3xs py-vertical-3xs bg-canvas text-body-xs text-neutral-subtle mx-horizontal-2xs my-m-vertical-2xs inline-flex items-center rounded-sm border font-mono"
            title={props.title}
        >
            {props.label}
        </span>
    );
};
