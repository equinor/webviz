import { getUserPhoto } from "@api";
import type { AvatarUserData } from "@lib/newComponents/Avatar";
import { makeInitials } from "@lib/utils/userNames";

export function fetchUserAvatar(userIdOrEmail: string, displayName?: string): () => Promise<AvatarUserData> {
    return async () => {
        const { data } = await getUserPhoto({
            query: { user_id_or_email: userIdOrEmail },
            throwOnError: true,
        });

        const initials = displayName ? (makeInitials(displayName) ?? "") : undefined;

        return {
            imageSrc: data?.avatar_b64str ? `data:image/png;base64,${data.avatar_b64str}` : undefined,
            initials,
            title: displayName,
            alt: displayName,
        };
    };
}
