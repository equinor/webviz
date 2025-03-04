import React from "react";

import type { ButtonProps } from "../Button/button";
import { Button } from "../Button/button";

export type HoldPressedIntervalCallbackButtonProps = Omit<ButtonProps, "ref"> & {
    onHoldPressedIntervalCallback: () => void;
};

function HoldPressedIntervalCallbackButtonComponent(
    props: HoldPressedIntervalCallbackButtonProps,
    ref: React.ForwardedRef<HTMLDivElement>
): React.ReactNode {
    const { onHoldPressedIntervalCallback, ...other } = props;

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    function handleClick() {
        onHoldPressedIntervalCallback();
    }

    function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        timeoutRef.current = setTimeout(() => {
            e.preventDefault();
            intervalRef.current = setInterval(() => {
                onHoldPressedIntervalCallback();
            }, 100);
        }, 300);
    }

    function handlePointerUp() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    return (
        <Button
            {...other}
            ref={ref}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
}

export const HoldPressedIntervalCallbackButton = React.forwardRef(HoldPressedIntervalCallbackButtonComponent);
