import type React from "react";

import { AccountCircle } from "@mui/icons-material";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { GraphUserPhoto_api } from "@api";
import { getUserPhotoOptions } from "@api";
import { CircularProgress } from "@lib/components/CircularProgress";

export type UserAvatarProps = {
    userEmail: string;
};

function useUserInfoQuery(userEmail: string): UseQueryResult<GraphUserPhoto_api> {
    return useQuery({
        ...getUserPhotoOptions({
            query: {
                user_email: userEmail,
            },
        }),
        enabled: userEmail !== "",
    });
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) => {
    const userInfo = useUserInfoQuery(props.userEmail);

    if (userInfo.isFetching) {
        return <CircularProgress size="medium-small" className="mr-1" />;
    }

    if (userInfo.data?.avatar_b64str) {
        return (
            <img
                src={`data:image/png;base64,${userInfo.data.avatar_b64str}`}
                alt="Avatar"
                className="w-5 h-5 rounded-full mr-1"
                title={props.userEmail}
            />
        );
    }
    return (
        <span title={props.userEmail}>
            <AccountCircle className="w-5 h-5 mr-1" />
        </span>
    );
};
