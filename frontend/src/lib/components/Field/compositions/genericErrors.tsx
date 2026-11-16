import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Field } from "..";

/**
 * A set of more concise error messages to use along-side Field.Error.
 */
export const ValidityMessages: Record<keyof ValidityStateFlags, string | undefined> = {
    tooShort: "Value is too short",
    tooLong: "Value is too long",
    badInput: "Value is not valid",
    valueMissing: "Value is required",
    typeMismatch: "Value type is incorrect",
    patternMismatch: "Value does not match pattern",
    rangeUnderflow: "Value is too low",
    rangeOverflow: "Value is too high",
    stepMismatch: "Value is not a valid step",
    customError: undefined,
} as const;

export type GenericErrorsProps = {
    /** Class names used for positioning */
    layoutClassName?: string;
    include?: (keyof ValidityStateFlags)[];
    /** Only show the first matching error if multiple matches are applicable */
    single?: boolean;
};

/**
 * Renders an error message for all possible ValidityState error-codes which our custom messages
 */
export function GenericErrors(props: GenericErrorsProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(props.layoutClassName, "empty:hidden", {
                "*:not-first:hidden": props.single,
            })}
        >
            <GenericError match="customError" include={props.include} />
            <GenericError match="valueMissing" include={props.include} />
            <GenericError match="tooShort" include={props.include} />
            <GenericError match="tooLong" include={props.include} />
            <GenericError match="badInput" include={props.include} />
            <GenericError match="typeMismatch" include={props.include} />
            <GenericError match="patternMismatch" include={props.include} />
            <GenericError match="rangeUnderflow" include={props.include} />
            <GenericError match="rangeOverflow" include={props.include} />
            <GenericError match="stepMismatch" include={props.include} />
        </div>
    );
}

function GenericError(props: {
    match: keyof ValidityStateFlags;
    include?: (keyof ValidityStateFlags)[];
}): React.ReactNode {
    if (props.include && !props.include.includes(props.match)) return null;

    // Pass error with no child to use the specific custom message
    if (props.match === "customError") return <Field.Error match="customError" />;

    return <Field.Error match={props.match}>{ValidityMessages[props.match]}</Field.Error>;
}
