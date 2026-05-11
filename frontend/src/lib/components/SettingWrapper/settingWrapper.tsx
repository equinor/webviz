import React from "react";

import { ContextHelp, type ContextHelpProps } from "../ContextHelp";

import { Annotations } from "./_components/Annotations";
import { Overlay, type OverlayProps } from "./_components/Overlay";
import { Field } from "@lib/newComponents/Field";
import { Heading } from "@lib/newComponents/Typography/compositions";

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

/**
 * Props for the SettingWrapper component.
 *
 * Note: Annotations can be provided either as an array of SettingAnnotation objects OR as individual
 * plain string properties (errorAnnotation, warningAnnotation, infoAnnotation), but not both.
 */
export type SettingWrapperProps = {
    children: React.ReactElement;
    errorOverlay?: string;
    warningOverlay?: string;
    infoOverlay?: string;
    loadingOverlay?: boolean;
    label?: React.ReactNode;
    description?: React.ReactNode;
    help?: ContextHelpProps;
} & (
    | {
          annotations?: SettingAnnotation[];
          errorAnnotation?: never;
          warningAnnotation?: never;
          infoAnnotation?: never;
      }
    | PlainAnnotationStrings
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
    const id = React.useId();

    const annotations: SettingAnnotation[] = isNotAnnotationList(props)
        ? ([
              props.errorAnnotation && { type: "error", message: props.errorAnnotation },
              props.warningAnnotation && { type: "warning", message: props.warningAnnotation },
              props.infoAnnotation && { type: "info", message: props.infoAnnotation },
          ].filter(Boolean) as SettingAnnotation[])
        : (props.annotations ?? []);

    let overlayType: OverlayProps["type"] = "none";
    if (props.loadingOverlay) {
        overlayType = "loading";
    } else if (props.errorOverlay) {
        overlayType = "error";
    } else if (props.warningOverlay) {
        overlayType = "warning";
    } else if (props.infoOverlay) {
        overlayType = "info";
    }

    return (
        <Field.Root layoutClassName="w-full">
            {props.label && <Field.Label>{props.label}</Field.Label>}
            {props.description && <Field.Description>{props.description}</Field.Description>}
            {props.help && (
                <Field.Info>
                    <Heading as="h6">{props.help.title}</Heading>
                    {props.help.content}
                </Field.Info>
            )}
            <div className="gap-vertical-xs relative flex w-full flex-col">
                {props.children}
                <Overlay type={overlayType} message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay} />
            </div>
            <Annotations annotations={annotations} />
        </Field.Root>
    );
}
