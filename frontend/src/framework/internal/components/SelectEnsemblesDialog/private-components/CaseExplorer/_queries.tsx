import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { GraphUserPhoto_api } from "@api";
import { getUserPhotoOptions } from "@api";

export function useUserInfoQuery(userEmail: string): UseQueryResult<GraphUserPhoto_api> {
    return useQuery({
        ...getUserPhotoOptions({
            query: {
                user_email: userEmail,
            },
        }),
        enabled: userEmail !== "",
    });
}
