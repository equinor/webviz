import type React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { Typography } from "@lib/newComponents/Typography";

import type { ComboboxGroup } from "../types";

export type ComboboxGroupLabelProps = {
    group: ComboboxGroup<any>;
    spanCols?: boolean;
};

export function ComboboxGroupLabel(props: ComboboxGroupLabelProps): React.ReactNode {
    return (
        <ComboboxBase.GroupLabel
            render={(subProps) => (
                <span
                    className={`bg-floating z-elevated pt-vertical-sm sticky top-0 col-span-2 col-start-1 grid grid-cols-subgrid uppercase ${props.spanCols ? "col-span-3" : ""}`}
                >
                    <span {...subProps} className={`col-start-2 ${props.spanCols ? "col-span-2" : ""}`}>
                        <Typography
                            family="body"
                            as="span"
                            size="sm"
                            lineHeight="squished"
                            weight="bolder"
                            tone="neutral"
                            variant="strong"
                        >
                            {props.group.value}
                        </Typography>
                    </span>
                </span>
            )}
        />
    );
}
