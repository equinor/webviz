import React from "react";

import "./webvizSpinnerAmsterdam.css";

export type WebvizSpinnerAmsterdamProps = {
    size: number;
};

export const WebvizSpinnerAmsterdam: React.FC<WebvizSpinnerAmsterdamProps> = (props) => {
    const borderWidth = props.size / 10;
    return (
        <div style={{ width: props.size, height: props.size }} className="webviz-spinner-amsterdam">
            <div
                className="rounded-full absolute border-t-[#003DA5]"
                style={{
                    borderWidth: borderWidth,
                    width: props.size - 0,
                    height: props.size - 0,
                    top: 5,
                }}
            />
            <div
                className="rounded-full absolute border-t-[#003DA5]"
                style={{
                    borderWidth: borderWidth,
                    width: props.size - 0,
                    height: props.size - 0,
                }}
            />
            <div
                className="rounded-full absolute border-t-[#C8102E]"
                style={{
                    borderWidth: borderWidth,
                    width: props.size - 8,
                    height: props.size - 8,
                    top: 12,
                    left: 5,
                }}
            />
        </div>
    );
};
