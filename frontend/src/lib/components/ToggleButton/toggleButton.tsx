import React from "react";

import type { ButtonProps as ButtonUnstyledProps } from "@mui/base";
import { Button as ButtonUnstyled } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type ToggleButtonProps = ButtonUnstyledProps & {
    active: boolean;
    onToggle: (active: boolean) => void;
    buttonRef?: React.Ref<HTMLButtonElement>;
};

function ToggleButtonComponent(props: ToggleButtonProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { active, onToggle, ...other } = props;
    const [isActive, setIsActive] = React.useState<boolean>(active);
    const [prevIsActive, setPrevIsActive] = React.useState<boolean>(active);

    if (active !== prevIsActive) {
        setIsActive(active);
        setPrevIsActive(active);
    }

    const buttonRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle<HTMLButtonElement | null, HTMLButtonElement | null>(
        props.buttonRef,
        () => buttonRef.current,
    );

    if (active !== prevIsActive) {
        setIsActive(active);
        setPrevIsActive(isActive);
    }

    const handleClick = React.useCallback(() => {
        setIsActive(!isActive);
        onToggle(!active);
    }, [active, onToggle, isActive]);

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <ButtonUnstyled
                {...other}
                onClick={handleClick}
                ref={buttonRef}
                slotProps={{
                    root: {
                        className: `inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500${
                            isActive ? " bg-indigo-400 hover:bg-indigo-500 text-white" : " bg-white hover:bg-slate-100"
                        }`,
                    },
                }}
            />
        </BaseComponent>
    );
}

export const ToggleButton = React.forwardRef(ToggleButtonComponent);
