import { Error, Info, Warning } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SettingAnnotation } from "../settingWrapper";

export type AnnotationsProps = {
    annotations: SettingAnnotation[];
};

export function Annotations(props: AnnotationsProps) {
    return (
        <>
            {props.annotations.map((a, i) => (
                <div
                    key={i}
                    className={resolveClassNames("flex gap-2 items-center text-sm", {
                        "text-red-600": a.type === "error",
                        "text-yellow-600": a.type === "warning",
                        "text-blue-600": a.type === "info",
                    })}
                >
                    <AnnotationIcon type={a.type} />
                    {a.message}
                </div>
            ))}
        </>
    );
}

function AnnotationIcon(props: { type: SettingAnnotation["type"] }) {
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
