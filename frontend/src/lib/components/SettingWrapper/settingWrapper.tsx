import { Error, Info, Warning } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { CircularProgress } from "../CircularProgress";

export type SettingAnnotation = {
    type: "warning" | "info" | "error" | "loading";
    message: string;
};

export type SettingState = "default" | "loading" | "loading-error";

export type SettingWrapperProps = {
    annotations?: SettingAnnotation[];
    children: React.ReactNode;
    state?: SettingState;
};

export function SettingWrapper(props: SettingWrapperProps) {
    return (
        <div className="relative flex flex-col gap-1">
            {props.children}
            {props.state === "loading" && (
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                    <CircularProgress size="small" />
                </div>
            )}
            {props.annotations?.map((annotation, index) => (
                <div
                    key={index}
                    className={resolveClassNames("flex gap-2 items-center text-sm", {
                        "text-red-600": annotation.type === "error",
                        "text-yellow-600": annotation.type === "warning",
                        "text-blue-600": annotation.type === "info",
                    })}
                >
                    <SettingAnnotationIcon type={annotation.type} />
                    {annotation.message}
                </div>
            ))}
        </div>
    );
}

export function SettingAnnotationIcon(props: { type: SettingAnnotation["type"] }) {
    switch (props.type) {
        case "warning":
            return <Warning fontSize="inherit" />;
        case "info":
            return <Info fontSize="inherit" />;
        case "error":
            return <Error fontSize="inherit" />;
        default:
            return null;
    }
}
