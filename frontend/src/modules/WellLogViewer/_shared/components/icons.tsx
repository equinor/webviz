import { WellLogCurveTypeEnum_api } from "@api";
import { ShowChart, ViewDay } from "@mui/icons-material";

export function TrackIcon(props: { type: WellLogCurveTypeEnum_api }) {
    if (props.type === WellLogCurveTypeEnum_api.CONTINUOUS) return <ShowChart fontSize="inherit" />;
    else return <ViewDay fontSize="inherit" />;
}
