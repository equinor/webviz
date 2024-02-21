import React from "react";

import { IconButton } from "@lib/components/IconButton";
import ArrowCircleLeftIcon from "@mui/icons-material/ArrowCircleLeft";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";

export type PrevNextButtonsProps = {
    onChange: (value: string) => void;
    options: string[];
    value: string;
    disabled?: boolean;
};
export const PrevNextButtons: React.FC<PrevNextButtonsProps> = (props) => {
    const changeSelection = (direction: "prev" | "next") => {
        const currentIndex = props.options.indexOf(props.value);
        let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= props.options.length) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = props.options.length - 1;
        }

        const nextValue = props.options[nextIndex];
        props.onChange(nextValue);
    };

    return (
        <div className="flex justify-end">
            <IconButton disabled={props.disabled} onClick={() => changeSelection("prev")}>
                <ArrowCircleLeftIcon />
            </IconButton>
            <IconButton disabled={props.disabled} onClick={() => changeSelection("next")}>
                <ArrowCircleRightIcon />
            </IconButton>
        </div>
    );
};
