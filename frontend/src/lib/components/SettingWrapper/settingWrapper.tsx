import React from "react";

import { Field } from "@lib/newComponents/Field";
import { Heading } from "@lib/newComponents/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { type ContextHelpProps } from "../ContextHelp";

import { Annotations } from "./_components/Annotations";
import { Overlay, type OverlayProps } from "./_components/Overlay";
import { SettingsLayoutContext } from ".";

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
    layout?: "inline" | "stacked";
    errorOverlay?: string;
    warningOverlay?: string;
    infoOverlay?: string;
    loadingOverlay?: boolean;
    label?: React.ReactNode;
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

    const isStacked = props.layout === "stacked" || groupContext === "stacked";

    if (isStacked) {
        return (
            <Field.Root layoutClassName="w-full col-span-2">
                <div className="gap-horizontal-2xs flex items-center">
                    {props.label && <Field.Label>{props.label}</Field.Label>}
                    {props.help && (
                        <Field.Info side="right">
                            <Heading as="h6">{props.help.title}</Heading>
                            {props.help.content}
                        </Field.Info>
                    )}
                </div>
                {props.description && <Field.Description>{props.description}</Field.Description>}
                <div className={resolveClassNames(props.contentClassName, "relative w-full")}>
                    {props.children}
                    <Overlay
                        type={overlayType}
                        message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay}
                    />
                </div>
                <Annotations annotations={annotations} />
            </Field.Root>
        );
    }

    if (!props.label) {
        return (
            <Field.Root inline>
                <div className="gap-x-horizontal-xs col-span-2 flex items-center">
                    <div className={resolveClassNames(props.contentClassName, "relative w-full")}>
                        {props.children}
                        <Overlay
                            type={overlayType}
                            message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay}
                        />
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

    return (
        <Field.Root inline>
            <div className="gap-vertical-4xs flex flex-col justify-center">
                <div className="gap-horizontal-2xs flex items-center">
                    {props.label && <Field.Label>{props.label}</Field.Label>}
                    {props.help && (
                        <Field.Info side="right">
                            <Heading as="h6">{props.help.title}</Heading>
                            {props.help.content}
                        </Field.Info>
                    )}
                </div>
                {props.description && <Field.Description>{props.description}</Field.Description>}
            </div>
            <div className="flex flex-col items-center">
                <div className={resolveClassNames(props.contentClassName, "relative w-full")}>
                    {props.children}
                    <Overlay
                        type={overlayType}
                        message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay}
                    />
                </div>
                <Annotations annotations={annotations} />
            </div>
        </Field.Root>
    );
}
