import React from "react";

import { Field } from "@lib/newComponents/Field";
import { Heading } from "@lib/newComponents/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SettingsLayoutContext } from "..";
import { type ContextHelpProps } from "../../ContextHelp";

import { Annotations } from "./Annotations";
import { Overlay, type OverlayProps } from "./Overlay";

export type SettingAnnotation = {
    type: "warning" | "info" | "error";
    message: string;
};

type PlainAnnotationStrings = {
    errorAnnotation?: string;
    warningAnnotation?: string;
    infoAnnotation?: string;
    annotations?: never;
};

export type Overlay = {
    type: Exclude<OverlayProps["type"], "none">;
    message?: string;
};

/**
 * Props for the SettingWrapper component.
 *
 * Note: Annotations can be provided either as an array of SettingAnnotation objects OR as individual
 * plain string properties (errorAnnotation, warningAnnotation, infoAnnotation), but not both.
 */
export type SettingWrapperProps = {
    children: React.ReactElement;
    /** When true, forces the setting to use a stacked layout regardless of the group context. */
    stacked?: boolean;
    label?: React.ReactNode;
    /** When the setting contains multiple inputs, pass a ref to the specific input the label should activate. */
    labelFor?: React.RefObject<HTMLElement | null>;
    description?: React.ReactNode;
    help?: ContextHelpProps;
    contentClassName?: string;
} & (
    | {
          annotations?: SettingAnnotation[];
          errorAnnotation?: never;
          warningAnnotation?: never;
          infoAnnotation?: never;
      }
    | PlainAnnotationStrings
) &
    (
        | {
              overlay?: Overlay;
              errorOverlay?: never;
              warningOverlay?: never;
              loadingOverlay?: never;
              infoOverlay?: never;
          }
        | {
              errorOverlay?: string;
              warningOverlay?: string;
              infoOverlay?: string;
              loadingOverlay?: boolean;
              overlay?: never;
          }
    );

function isNotAnnotationList(props: SettingWrapperProps): props is SettingWrapperProps & PlainAnnotationStrings {
    return props.annotations === undefined;
}

/**
 * A wrapper component for module settings that provides consistent styling for labels, help text,
 * annotations, and overlay states.
 *
 * Supports two ways to display annotations: either through an array of SettingAnnotation objects
 * or via individual string properties (errorAnnotation, warningAnnotation, infoAnnotation).
 * These two approaches are mutually exclusive and cannot be combined.
 */
export function SettingWrapper(props: SettingWrapperProps) {
    const groupContext = React.useContext(SettingsLayoutContext);
    const generatedInputId = React.useId();

    React.useLayoutEffect(() => {
        const el = props.labelFor?.current;
        if (el && !el.id) {
            el.id = generatedInputId;
        }
    }, [props.labelFor, generatedInputId]);

    const htmlFor = props.labelFor ? generatedInputId : undefined;

    const annotations: SettingAnnotation[] = isNotAnnotationList(props)
        ? ([
              props.errorAnnotation && { type: "error", message: props.errorAnnotation },
              props.warningAnnotation && { type: "warning", message: props.warningAnnotation },
              props.infoAnnotation && { type: "info", message: props.infoAnnotation },
          ].filter(Boolean) as SettingAnnotation[])
        : (props.annotations ?? []);

    const overlay: Overlay | undefined =
        "overlay" in props
            ? props.overlay
            : props.loadingOverlay
              ? { type: "loading", message: "Loading..." }
              : props.errorOverlay
                ? { type: "error", message: props.errorOverlay }
                : props.warningOverlay
                  ? { type: "warning", message: props.warningOverlay }
                  : props.infoOverlay
                    ? { type: "info", message: props.infoOverlay }
                    : undefined;

    const isInvalid = annotations.some((a) => a.type === "error");
    const isWarning = annotations.some((a) => a.type === "warning");

    if (!props.label) {
        return (
            <Field.Root inline invalid={isInvalid} warning={isWarning}>
                <div className="gap-x-xs col-span-2 flex items-center">
                    <div className={resolveClassNames(props.contentClassName, "relative w-full")}>
                        <div
                            style={{ display: "contents" }}
                            ref={(el) => {
                                if (el) el.inert = !!props.overlay;
                            }}
                        >
                            {props.children}
                        </div>
                        {overlay && <Overlay type={overlay.type} message={overlay.message} />}
                    </div>
                    <Annotations annotations={annotations} />
                    {props.help && (
                        <Field.Info side="right">
                            <Heading as="h6">{props.help.title}</Heading>
                            {props.help.content}
                        </Field.Info>
                    )}
                </div>
            </Field.Root>
        );
    }

    const isStacked = props.stacked || groupContext === "stacked";

    if (isStacked) {
        return (
            <Field.Root layoutClassName="w-full col-span-3" invalid={isInvalid} warning={isWarning}>
                <div className="gap-x-2xs flex w-full items-center justify-between">
                    {props.label && <Field.Label {...(htmlFor && { htmlFor })}>{props.label}</Field.Label>}
                    {props.help && (
                        <Field.Info side="right">
                            <Heading as="h6">{props.help.title}</Heading>
                            {props.help.content}
                        </Field.Info>
                    )}
                </div>
                {props.description && <Field.Description>{props.description}</Field.Description>}
                <div className={resolveClassNames(props.contentClassName, "relative w-full")}>
                    <div
                        style={{ display: "contents" }}
                        ref={(el) => {
                            if (el) el.inert = !!overlay;
                        }}
                    >
                        {props.children}
                    </div>
                    {overlay && <Overlay type={overlay.type} message={overlay.message} />}
                </div>
                <Annotations annotations={annotations} />
            </Field.Root>
        );
    }

    return (
        <Field.Root inline invalid={isInvalid} warning={isWarning}>
            <div className="gap-y-4xs flex flex-col justify-center">
                <div className="gap-x-2xs flex items-center">
                    {props.label && <Field.Label {...(htmlFor && { htmlFor })}>{props.label}</Field.Label>}
                </div>
                {props.description && <Field.Description>{props.description}</Field.Description>}
            </div>
            <div
                className={resolveClassNames(props.contentClassName, "relative w-full items-center", {
                    "col-span-2": !props.help,
                })}
            >
                <div
                    style={{ display: "contents" }}
                    ref={(el) => {
                        if (el) el.inert = !!overlay;
                    }}
                >
                    {props.children}
                </div>
                {overlay && <Overlay type={overlay.type} message={overlay.message} />}
            </div>
            {props.help && (
                <div className="self-center">
                    <Field.Info side="right">
                        <Heading as="h6">{props.help.title}</Heading>
                        {props.help.content}
                    </Field.Info>
                </div>
            )}
            {annotations.length > 0 && (
                <div className={resolveClassNames("col-start-2 flex flex-col", { "col-span-2": !props.help })}>
                    <Annotations annotations={annotations} />
                </div>
            )}
        </Field.Root>
    );
}
