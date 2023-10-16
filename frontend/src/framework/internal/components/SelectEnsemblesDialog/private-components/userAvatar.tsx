import React from "react";

import { GraphUserPhoto_api } from "@api";
import { apiService } from "@framework/ApiService";
import { CircularProgress } from "@lib/components/CircularProgress";
import { AccountCircle } from "@mui/icons-material";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export type UserAvatarProps = {
    userId: string;
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

function useUserInfoQuery(userId: string): UseQueryResult<GraphUserPhoto_api> {
    return useQuery({
        queryKey: ["getUserInfo", userId],
        queryFn: () => apiService.graph.userInfo(`${userId.toUpperCase()}@equinor.com`),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: userId !== "",
    });
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) => {
    const userInfo = useUserInfoQuery(props.userId);

    if (userInfo.isFetching) {
        return <CircularProgress size="medium-small" className="mr-1" />;
    }

    if (userInfo.data?.avatar_b64str) {
        return (
            <img
                src={`data:image/png;base64,${userInfo.data.avatar_b64str}`}
                alt="Avatar"
                className="w-5 h-5 rounded-full mr-1"
                title={props.userId}
            />
        );
    }
    return (
        <span title={props.userId}>
            <AccountCircle className="w-5 h-5 mr-1" />
        </span>
    );
};
