import { Error, Info, Warning } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SettingAnnotation } from "./SettingWrapper";
import { Field } from "@lib/newComponents/Field";
import { Paragraph, ParagraphProps } from "@lib/newComponents/Typography/compositions";

export type AnnotationsProps = {
    annotations: SettingAnnotation[];
};

const ANNOTATION_TYPE_TONE_MAP: Record<SettingAnnotation["type"], ParagraphProps["tone"]> = {
    error: "danger",
    warning: "warning",
    info: "neutral",
};

export function Annotations(props: AnnotationsProps) {
    return (
        <>
            {props.annotations.map((a, i) => (
                <Paragraph
                    size="sm"
                    key={i}
                    tone={ANNOTATION_TYPE_TONE_MAP[a.type]}
                    layoutClassName="flex items-center gap-horizontal-2xs"
                >
                    <AnnotationIcon type={a.type} />
                    {a.message}
                </Paragraph>
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
