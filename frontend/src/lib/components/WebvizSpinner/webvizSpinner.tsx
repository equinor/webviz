import React from "react";

import "./webvizSpinner.css";

export type WebvizSpinnerProps = {
    size: number;
};

export const WebvizSpinner: React.FC<WebvizSpinnerProps> = (props) => {
    const borderWidth = props.size / 10;
    return (
        <div style={{ width: props.size, height: props.size }} className="webviz-spinner">
            <div
                className="rounded-full absolute border-t-[#366f9d]"
                style={{
                    borderWidth: borderWidth,
                    width: props.size - 0,
                    height: props.size - 0,
                    top: 5,
                }}
            />
            <div
                className="rounded-full absolute border-t-[#366f9d]"
                style={{
                    borderWidth: borderWidth,
                    width: props.size - 0,
                    height: props.size - 0,
                }}
            />
            <div
                className="rounded-full absolute border-t-[#ffdf51]"
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
