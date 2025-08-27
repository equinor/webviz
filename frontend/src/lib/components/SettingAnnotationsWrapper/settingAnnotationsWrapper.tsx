import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Error, Info, Warning } from "@mui/icons-material";

export type SettingAnnotation = {
    type: "warning" | "info" | "error";
    message: string;
};

export type SettingAnnotationsWrapperProps = {
    annotations?: SettingAnnotation[];
    children: React.ReactNode;
};

export function SettingAnnotationsWrapper(props: SettingAnnotationsWrapperProps) {
    return (
        <div className="text-sm">
            {props.children}
            {props.annotations?.map((annotation, index) => (
                <div
                    key={index}
                    className={resolveClassNames("flex gap-2 items-center", {
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
