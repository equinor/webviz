import React from "react";

import { Avatar as AvatarBase, type ImageLoadingStatus } from "@base-ui/react/avatar";
import PersonIcon from "@mui/icons-material/Person";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { PixelSize } from "../_shared/size";
import { CircularProgress } from "../CircularProgress";

export type AvatarUserData = {
    imageSrc?: string;
    initials?: string;
    title?: string;
    alt?: string;
};

export type AvatarProps = {
    userData?: AvatarUserData | (() => Promise<AvatarUserData>);
    size?: PixelSize;
    disabled?: boolean;
};

type UserDataState =
    | { status: "direct"; data: AvatarUserData }
    | { status: "loading" }
    | { status: "loaded"; data: AvatarUserData }
    | { status: "rejected" };

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
    16: "h-4 aspect-square text-body-xs tracking-body-xs-tight",
    24: "h-6 aspect-square text-body-sm tracking-body-sm-tight",
    32: "h-8 aspect-square text-body-md tracking-body-md-tight",
    40: "h-10 aspect-square text-body-xl tracking-body-xl-tight",
    48: "h-12 aspect-square text-body-2xl tracking-body-2xl-tight",
};

const DEFAULT_PROPS = {
    size: 48,
} satisfies Partial<AvatarProps>;

export function Avatar(props: AvatarProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const { userData: image } = defaultedProps;

    const [userDataState, setUserDataState] = React.useState<UserDataState>(() => {
        if (image && typeof image !== "function") return { status: "direct", data: image };
        if (typeof image === "function") return { status: "loading" };
        return { status: "rejected" };
    });
    const [imageLoadingStatus, setImageLoadingStatus] = React.useState<ImageLoadingStatus>("idle");

    React.useEffect(
        function loadImageEffect() {
            if (image && typeof image !== "function") {
                setUserDataState({ status: "direct", data: image });
                return;
            }
            if (typeof image === "function") {
                let isMounted = true;
                setUserDataState({ status: "loading" });
                image()
                    .then((data) => {
                        if (isMounted) setUserDataState({ status: "loaded", data });
                    })
                    .catch(() => {
                        if (isMounted) setUserDataState({ status: "rejected" });
                    });
                return () => {
                    isMounted = false;
                };
            }
            setUserDataState({ status: "rejected" });
        },
        [image],
    );

    const handleImageLoadingStatusChange = React.useCallback(function handleImageLoadingStatusChange(
        status: ImageLoadingStatus,
    ) {
        setImageLoadingStatus(status);
    }, []);

    const imageData =
        userDataState.status === "direct" || userDataState.status === "loaded" ? userDataState.data : undefined;

    const showImage = imageData !== undefined;

    return (
        <span className="relative inline-flex align-middle">
            <AvatarBase.Root
                className={resolveClassNames(
                    "inline-flex items-center justify-center overflow-hidden rounded-full",
                    SIZE_CLASSES[defaultedProps.size],
                    {
                        "opacity-50": defaultedProps.disabled,
                    },
                )}
                render={<span />}
            >
                {showImage && (
                    <AvatarBase.Image
                        src={imageData.imageSrc}
                        alt={imageData.alt}
                        className="h-full w-full object-cover"
                        render={<img />}
                        onLoadingStatusChange={handleImageLoadingStatusChange}
                    />
                )}
                <AvatarBase.Fallback
                    className={resolveClassNames(
                        "bg-neutral text-neutral-subtle flex h-full w-full items-center justify-center leading-px font-medium uppercase not-italic no-underline",
                        {},
                    )}
                    render={<span />}
                >
                    {userDataState.status === "rejected" ? (
                        <PersonIcon fontSize="inherit" />
                    ) : (
                        (imageData?.initials ?? <PersonIcon fontSize="inherit" />)
                    )}
                </AvatarBase.Fallback>
            </AvatarBase.Root>
            <span
                className={resolveClassNames(
                    "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                    {
                        "opacity-0": userDataState.status !== "loading" || imageLoadingStatus === "loaded",
                        "opacity-100": userDataState.status === "loading" && imageLoadingStatus !== "loaded",
                    },
                )}
            >
                <CircularProgress size={defaultedProps.size} />
            </span>
        </span>
    );
}
