import { apiService } from "@framework/ApiService";
import { Memory } from "@mui/icons-material";

export const UserSessionState = ({ expanded }: { expanded: boolean }) => {
    // const sessionState = useUserSessionState();
    // const memoryPercent = Math.round(sessionState.data?.memorySystem?.percent) || "-"
    // const cpuPercent = Math.round(sessionState.data?.cpuPercent) || "-"
    const memoryPercent = "-";
    const cpuPercent = "-";

    return (
        <div className="text-xs whitespace-nowrap text-gray-400">
            <div>
                <Memory fontSize="small" /> {expanded ? "Memory:" : "M"} {memoryPercent} %
            </div>
            <div>
                <Memory fontSize="small" /> {expanded ? "CPU:" : "C"} {cpuPercent} %
            </div>
        </div>
    );
};
