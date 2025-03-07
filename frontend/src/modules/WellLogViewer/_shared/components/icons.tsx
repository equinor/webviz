import { WellLogCurveTypeEnum_api } from "@api";
import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { ShowChart, ViewDay } from "@mui/icons-material";

export function TrackIcon(props: { type: TemplateTrackConfig["_type"] }) {
    if (props.type === WellLogCurveTypeEnum_api.CONTINUOUS) return <ShowChart fontSize="inherit" />;
    else return <ViewDay fontSize="inherit" />;
}
