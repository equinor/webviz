import { Memory } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { apiService } from "@framework/ApiService";

const useUserSessionState = () => useQuery({
    queryKey: ["default.userSessionContainer"],
    queryFn: () => apiService.default.userSessionContainer(),
    refetchInterval: 200000
});

export const UserSessionState = ({expanded}: {expanded: boolean}) => {

    const sessionState = useUserSessionState();

    const memoryPercent = Math.round(sessionState.data?.memorySystem?.percent) || "-"
    const cpuPercent = Math.round(sessionState.data?.cpuPercent) || "-"

    return <div className="text-xs whitespace-nowrap text-gray-400">
        <div><Memory fontSize="small" /> {expanded ? "Memory:" : "M"} {memoryPercent} %</div>
        <div><Memory fontSize="small" /> {expanded ? "CPU:" : "C"} {cpuPercent} %</div>
    </div>
}
