import React from "react";

export type TagProps = {
    label: string;
    title?: string;
};

export const Tag: React.FC<TagProps> = (props) => {
    return (
        <span
            className="inline-flex items-center p-2 m-2 rounded border text-xs font-medium bg-gray-100 text-gray-800 font-mono"
            title={props.title}
        >
            {props.label}
        </span>
    );
};
