import React from "react";

import { Field as FieldPrimitive } from "@lib/components/Field";
import { Heading } from "@lib/components/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SettingLayoutContext } from "..";

import { Annotations } from "./Annotations";
import { Overlay, type OverlayProps } from "./Overlay";

export type SettingAnnotation = {
    /** The severity level that determines the icon and color of the annotation. */
    type: "warning" | "info" | "error";
    /** The message text displayed in the annotation. */
    message: string;
};

type PlainAnnotationStrings = {
    /** Error annotation shown below the input. Mutually exclusive with `annotations`. */
    errorAnnotation?: string;
    /** Warning annotation shown below the input. Mutually exclusive with `annotations`. */
    warningAnnotation?: string;
    /** Info annotation shown below the input. Mutually exclusive with `annotations`. */
    infoAnnotation?: string;
    annotations?: never;
};

export type Overlay = {
    type: Exclude<OverlayProps["type"], "none">;
    message?: string;
};

/**
 * Props for the Setting.Field component.
 *
 * Note: Annotations can be provided either as an array of SettingAnnotation objects OR as individual
 * plain string properties (errorAnnotation, warningAnnotation, infoAnnotation), but not both.
 */
export type SettingFieldProps = {
    /** The input control(s) rendered as the setting's content. */
    children: React.ReactNode;
    /** When true, forces the setting to use a stacked layout regardless of the group context. */
    stacked?: boolean;
    /** The label shown beside or above the input. */
    label?: React.ReactNode;
    /** When the setting contains multiple inputs, pass a ref to the specific input the label should activate. */
    labelFor?: React.RefObject<HTMLElement | null>;
    /** Optional descriptive text shown below the label. */
    description?: React.ReactNode;
    /** Configuration for a context help popover shown next to the label. */
    help?: {
        /** The title of the context help popover. */
        title: React.ReactNode;
        /** The content of the context help popover. */
        content: React.ReactNode;
    };
    /** Additional CSS class applied to the content wrapper element. */
    contentClassName?: string;
} & (
    | {
          /** Annotations rendered below the input. Mutually exclusive with the individual annotation string props. */
          annotations?: SettingAnnotation[];
          errorAnnotation?: never;
          warningAnnotation?: never;
          infoAnnotation?: never;
      }
    | PlainAnnotationStrings
) &
    (
        | {
              /** Overlay displayed over the input. Mutually exclusive with individual overlay props. */
              overlay?: Overlay;
              errorOverlay?: never;
              warningOverlay?: never;
              loadingOverlay?: never;
              infoOverlay?: never;
          }
        | {
              /** Error message overlay. Mutually exclusive with `overlay`. */
              errorOverlay?: string;
              /** Warning message overlay. Mutually exclusive with `overlay`. */
              warningOverlay?: string;
              /** Info message overlay. Mutually exclusive with `overlay`. */
              infoOverlay?: string;
              /** When true, shows a loading spinner overlay. Mutually exclusive with `overlay`. */
              loadingOverlay?: boolean;
              overlay?: never;
          }
    );

function isNotAnnotationList(props: SettingFieldProps): props is SettingFieldProps & PlainAnnotationStrings {
    return props.annotations === undefined;
}

export function Field(props: SettingFieldProps) {
    const groupContext = React.useContext(SettingLayoutContext);
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
            : (props.loadingOverlay && { type: "loading", message: "Loading..." }) ||
              (props.errorOverlay && { type: "error", message: props.errorOverlay }) ||
              (props.warningOverlay && { type: "warning", message: props.warningOverlay }) ||
              (props.infoOverlay && { type: "info", message: props.infoOverlay }) ||
              undefined;

    const isInvalid = annotations.some((a) => a.type === "error");
    const isWarning = annotations.some((a) => a.type === "warning");

    if (!props.label) {
        return (
            <div className="setting-row in-data-in-section:px-xs in-data-in-section:py-2xs in-data-in-group:px-xs in-data-in-group:py-2xs in-data-in-group:col-span-3 in-data-in-group:grid in-data-in-group:grid-cols-subgrid in-data-in-section:col-span-3 in-data-in-section:grid in-data-in-section:grid-cols-subgrid">
                <FieldPrimitive.Root inline invalid={isInvalid} warning={isWarning}>
                    <div
                        className={resolveClassNames(props.contentClassName, "relative w-full items-center", {
                            "col-span-2": !!props.help,
                            "col-span-3": !props.help,
                        })}
                    >
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
                    {props.help && (
                        <div className="self-center">
                            <FieldPrimitive.Info side="right">
                                <Heading as="h6">{props.help.title}</Heading>
                                {props.help.content}
                            </FieldPrimitive.Info>
                        </div>
                    )}
                    {annotations.length > 0 && (
                        <div
                            className={resolveClassNames("flex flex-col", {
                                "col-span-2": !!props.help,
                                "col-span-3": !props.help,
                            })}
                        >
                            <Annotations annotations={annotations} />
                        </div>
                    )}
                </FieldPrimitive.Root>
            </div>
        );
    }

    const isStacked = props.stacked || groupContext === "stacked";

    if (isStacked) {
        return (
            <div className="setting-row in-data-in-section:px-xs in-data-in-section:py-2xs in-data-in-group:px-xs in-data-in-group:py-2xs in-data-in-group:col-span-3 in-data-in-group:grid in-data-in-group:grid-cols-subgrid in-data-in-section:col-span-3 in-data-in-section:grid in-data-in-section:grid-cols-subgrid">
                <FieldPrimitive.Root layoutClassName="w-full col-span-3" invalid={isInvalid} warning={isWarning}>
                    <div className="gap-x-2xs flex w-full items-center justify-between">
                        {props.label && <FieldPrimitive.Label {...(htmlFor && { htmlFor })}>{props.label}</FieldPrimitive.Label>}
                        {props.help && (
                            <FieldPrimitive.Info side="right">
                                <Heading as="h6">{props.help.title}</Heading>
                                {props.help.content}
                            </FieldPrimitive.Info>
                        )}
                    </div>
                    {props.description && <FieldPrimitive.Description>{props.description}</FieldPrimitive.Description>}
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
                </FieldPrimitive.Root>
            </div>
        );
    }

    return (
        <div className="setting-row in-data-in-section:px-xs in-data-in-section:py-2xs in-data-in-group:px-xs in-data-in-group:py-2xs in-data-in-group:col-span-3 in-data-in-group:grid in-data-in-group:grid-cols-subgrid in-data-in-section:col-span-3 in-data-in-section:grid in-data-in-section:grid-cols-subgrid">
            <FieldPrimitive.Root inline invalid={isInvalid} warning={isWarning}>
                <div className="gap-y-4xs flex flex-col justify-center">
                    <div className="gap-x-2xs flex items-center">
                        {props.label && <FieldPrimitive.Label {...(htmlFor && { htmlFor })}>{props.label}</FieldPrimitive.Label>}
                    </div>
                    {props.description && <FieldPrimitive.Description>{props.description}</FieldPrimitive.Description>}
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
                        <FieldPrimitive.Info side="right">
                            <Heading as="h6">{props.help.title}</Heading>
                            {props.help.content}
                        </FieldPrimitive.Info>
                    </div>
                )}
                {annotations.length > 0 && (
                    <div className={resolveClassNames("col-start-2 flex flex-col", { "col-span-2": !props.help })}>
                        <Annotations annotations={annotations} />
                    </div>
                )}
            </FieldPrimitive.Root>
        </div>
    );
}
