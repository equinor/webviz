import React from "react";

import { ButtonUnstyled, ButtonUnstyledProps } from "@mui/base";

export type ToggleButtonProps = ButtonUnstyledProps & {
    active: boolean;
    onToggle: (active: boolean) => void;
};

export const ToggleButton = React.forwardRef((props: ToggleButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const { active, onToggle, ...other } = props;
    const [isActive, setIsActive] = React.useState<boolean>(active);

    const handleClick = React.useCallback(() => {
        setIsActive(!isActive);
        onToggle(!active);
    }, [active, onToggle]);

    return (
        <ButtonUnstyled
            {...other}
            onClick={handleClick}
            ref={ref}
            slotProps={{
                root: {
                    className: `inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500${
                        isActive ? " bg-indigo-400 hover:bg-indigo-500 text-white" : " bg-white hover:bg-slate-100"
                    }`,
                },
            }}
        />
    );
});

ToggleButton.displayName = "ToggleButton";
