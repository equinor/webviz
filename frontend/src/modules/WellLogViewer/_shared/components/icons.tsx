import { ShowChart, ViewDay } from "@mui/icons-material";

import { WellLogCurveTypeEnum_api } from "@api";
import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";

export function TrackIcon(props: { type: TemplateTrackConfig["_type"] }) {
    if (props.type === WellLogCurveTypeEnum_api.CONTINUOUS) return <ShowChart fontSize="inherit" />;
    else return <ViewDay fontSize="inherit" />;
}
