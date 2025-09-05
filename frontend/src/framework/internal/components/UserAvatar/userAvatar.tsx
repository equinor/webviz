import type React from "react";

import { AccountCircle } from "@mui/icons-material";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { GraphUserPhoto_api } from "@api";
import { getUserPhotoOptions } from "@api";
import type { SizeName } from "@framework/utils/getNamedSizeClass";
import { getSizeClass } from "@framework/utils/getNamedSizeClass";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type UserAvatarProps = {
    userEmail: string;
    size?: SizeName;
    className?: React.HTMLAttributes<HTMLDivElement>["className"];
};

function useUserInfoQuery(userEmail: string): UseQueryResult<GraphUserPhoto_api> {
    return useQuery({
        ...getUserPhotoOptions({
            query: {
                user_id_or_email: userEmail,
            },
        }),
        enabled: userEmail !== "",
    });
}

export const UserAvatar: React.FC<UserAvatarProps> = (props) => {
    const userInfo = useUserInfoQuery(props.userEmail);
    const sizeOrDefault = props.size ?? "medium-small";
    const sizeClass = getSizeClass(sizeOrDefault);

    if (userInfo.isFetching) {
        return <CircularProgress size={sizeOrDefault} className={resolveClassNames("p-0.5", props.className)} />;
    }

    if (userInfo.data?.avatar_b64str) {
        return (
            <img
                src={`data:image/png;base64,${userInfo.data?.avatar_b64str}`}
                alt="Avatar"
                title={props.userEmail}
                className={resolveClassNames(sizeClass, "rounded-full p-0.5", props.className)}
            />
        );
    }
    return (
        <span title={props.userEmail} className={resolveClassNames(sizeClass, props.className)}>
            {/* size-auto ensures the icon follows the wrapper size-class */}
            <AccountCircle classes={{ root: "size-auto! " }} />
        </span>
    );
};
