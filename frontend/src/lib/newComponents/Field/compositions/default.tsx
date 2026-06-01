import React from "react";

import { omit } from "lodash";

import type { FieldRootProps } from "..";
import { Field } from "..";

import { GenericErrors } from "./genericErrors";

export type DefaultProps = {
    /** The field's controller */
    children: React.ReactNode;
    /** Only show a single error if multiple apply */
    singleError?: boolean;
    /**
     * Displays the field contents in a layout that fits a grid layout.
     *
     * **Note**:
     * - This variant has no wrapping element, so layoutClassName will not apply
     * - The error text will display on it's own grid row, so some layout tweaks might be needed
     * */
    gridLayout?: boolean;

    label: string;
    description?: React.ReactNode;
    info?: React.ReactNode;
    indicator?: string;
} & Omit<FieldRootProps, "inline">;

function DefaultComponent(props: DefaultProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = omit(props, "label", "children", "description", "info", "indicator", "singleError", "gridLayout");

    function makeLabel() {
        return (
            <Field.Label layoutClassName="--label" indicator={props.indicator}>
                {props.label}
            </Field.Label>
        );
    }

    if (props.gridLayout) {
        return (
            <Field.Root ref={ref} inline {...baseProps}>
                {props.description ? (
                    <div>
                        {makeLabel()}
                        <Field.Description layoutClassName="--description">{props.description}</Field.Description>
                    </div>
                ) : (
                    makeLabel()
                )}

                {props.info ? (
                    <div className="gap-horizontal-2xs flex items-center">
                        {props.children}
                        <Field.Info>{props.info}</Field.Info>
                    </div>
                ) : (
                    props.children
                )}

                {/* ! In the grid layout, we assume it's a grid layout with two columns. The error div is then pushed to be in the same column as the input. We cant know what gap sizes are, so further tweaking of margins can be done by selecting the --errorWrapper class*/}
                <GenericErrors layoutClassName="--errorWrapper -col-end-1 " single={props.singleError} />
            </Field.Root>
        );
    }

    return (
        <Field.Root ref={ref} {...baseProps}>
            {props.info ? (
                <div className="gap-horizontal-2xs flex items-center">
                    {makeLabel()}

                    <Field.Info>{props.info}</Field.Info>
                </div>
            ) : (
                makeLabel()
            )}

            {props.description && (
                <Field.Description layoutClassName="--description">{props.description}</Field.Description>
            )}

            {props.children}
            <GenericErrors layoutClassName="--errorWrapper" single={props.singleError} />
        </Field.Root>
    );
}

/**
 * A standard layout for a field
 */
export const Default = React.forwardRef<HTMLDivElement, DefaultProps>(DefaultComponent);
