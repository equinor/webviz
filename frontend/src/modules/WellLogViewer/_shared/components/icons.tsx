import { ShowChart, ViewDay } from "@mui/icons-material";

import { WellLogCurveTypeEnum_api } from "@api";

export function TrackIcon(props: { type: WellLogCurveTypeEnum_api }) {
    if (props.type === WellLogCurveTypeEnum_api.CONTINUOUS) return <ShowChart fontSize="inherit" />;
    else return <ViewDay fontSize="inherit" />;
}
