import React from "react";

import { Annotations } from "./_components/Annotations";
import { Help } from "./_components/Help";
import { Overlay, type OverlayProps } from "./_components/Overlay";

export type SettingAnnotation = {
    type: "warning" | "info" | "error";
    message: string;
};

type PlainAnnotationStrings = {
    errorAnnotation?: string;
    warningAnnotation?: string;
    infoAnnotation?: string;
};

export type Help = {
    title: string;
    content: React.ReactNode;
};

export type SettingWrapperProps = {
    children: React.ReactElement;
    errorOverlay?: string;
    warningOverlay?: string;
    infoOverlay?: string;
    loadingOverlay?: boolean;
    label?: React.ReactNode;
    help?: Help;
} & (
    | {
          annotations?: SettingAnnotation[];
      }
    | PlainAnnotationStrings
);

function isNotAnnotationList(props: SettingWrapperProps): props is SettingWrapperProps & PlainAnnotationStrings {
    return !Array.isArray((props as any).annotations);
}

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
        <div className="flex flex-col gap-1">
            {props.label && (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-500 leading-tight" htmlFor={id}>
                        {props.label}
                    </label>
                    {props.help && <Help title={props.help.title} content={props.help.content} />}
                </div>
            )}
            <div className="relative">
                {React.cloneElement(props.children, { id })}
                <Overlay type={overlayType} message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay} />
            </div>
            <Annotations annotations={annotations} />
        </div>
    );
}
