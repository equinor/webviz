import { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { ShowChart, ViewDay } from "@mui/icons-material";

export function TrackIcon(props: { type: TemplateTrackConfig["_type"] }) {
    if (props.type === "continous") return <ShowChart fontSize="inherit" />;
    else return <ViewDay fontSize="inherit" />;
}
