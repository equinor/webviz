import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { getUserPhoto } from "@api";
import type { AvatarUserData } from "@lib/newComponents/Avatar";
import { makeInitials } from "@lib/utils/userNames";

const STALE_TIME_MS = 10 * 60 * 1000;

export function useUserAvatar(userIdOrEmail: string, displayName?: string): () => Promise<AvatarUserData> {
    const queryClient = useQueryClient();
    return React.useCallback(
        async () => {
            const initials = displayName ? (makeInitials(displayName) ?? "") : undefined;

            if (!userIdOrEmail) {
                return { initials, title: displayName, alt: displayName };
            }

            const apiData = await queryClient.fetchQuery({
                queryKey: ["userAvatar", userIdOrEmail],
                queryFn: async () => {
                    const { data } = await getUserPhoto({
                        query: { user_id_or_email: userIdOrEmail },
                        throwOnError: true,
                    });
                    return data;
                },
                staleTime: STALE_TIME_MS,
            });

            return {
                imageSrc: apiData?.avatar_b64str ? `data:image/png;base64,${apiData.avatar_b64str}` : undefined,
                initials,
                title: displayName,
                alt: displayName,
            };
        },
        [queryClient, userIdOrEmail, displayName],
    );
}
