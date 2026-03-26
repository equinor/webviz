import { getUserPhoto } from "@api";
import type { AvatarUserData } from "@lib/components/Avatar";

function getInitials(displayName: string): string {
    return displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

export function fetchUserAvatar(userIdOrEmail: string, displayName?: string): () => Promise<AvatarUserData> {
    return async () => {
        const { data } = await getUserPhoto({
            query: { user_id_or_email: userIdOrEmail },
            throwOnError: true,
        });

        const initials = displayName ? getInitials(displayName) : undefined;

        return {
            imageSrc: data?.avatar_b64str ? `data:image/png;base64,${data.avatar_b64str}` : undefined,
            initials,
            title: displayName,
            alt: displayName,
        };
    };
}
