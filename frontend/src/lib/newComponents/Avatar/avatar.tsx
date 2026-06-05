import React from "react";

import { Avatar as AvatarBase, type ImageLoadingStatus } from "@base-ui/react/avatar";
import PersonIcon from "@mui/icons-material/Person";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { PixelSize } from "../_shared/utils/size";
import { type LayoutClassProps } from "../_shared/utils/wrapperProps";
import { CircularProgress } from "../CircularProgress";

export type AvatarUserData = {
    imageSrc?: string;
    initials?: string;
    title?: string;
    alt?: string;
};

export type AvatarProps = LayoutClassProps & {
    userData?: AvatarUserData | (() => Promise<AvatarUserData>);
    size?: PixelSize;
    disabled?: boolean;
};

type UserDataWithStatus =
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

export const Avatar = React.forwardRef<HTMLButtonElement, AvatarProps>(function Avatar(props, ref): React.ReactNode {
    const { userData, size = 48 } = props;

    const [userDataWithStatus, setUserDataWithStatus] = React.useState<UserDataWithStatus>(() => {
        if (userData && typeof userData !== "function") {
            return { status: "direct", data: userData };
        }
        if (typeof userData === "function") {
            return { status: "loading" };
        }
        return { status: "rejected" };
    });
    const [imageLoadingStatus, setImageLoadingStatus] = React.useState<ImageLoadingStatus>("idle");

    React.useEffect(
        function loadImageEffect() {
            if (userData && typeof userData !== "function") {
                setUserDataWithStatus({ status: "direct", data: userData });
                return;
            }
            if (typeof userData === "function") {
                let isMounted = true;
                setUserDataWithStatus({ status: "loading" });
                userData()
                    .then((data) => {
                        if (isMounted) setUserDataWithStatus({ status: "loaded", data });
                    })
                    .catch(() => {
                        if (isMounted) setUserDataWithStatus({ status: "rejected" });
                    });
                return () => {
                    isMounted = false;
                };
            }
            setUserDataWithStatus({ status: "rejected" });
        },
        [userData],
    );

    const handleImageLoadingStatusChange = React.useCallback(function handleImageLoadingStatusChange(
        status: ImageLoadingStatus,
    ) {
        setImageLoadingStatus(status);
    }, []);

    const imageData =
        userDataWithStatus.status === "direct" || userDataWithStatus.status === "loaded"
            ? userDataWithStatus.data
            : undefined;

    const showImage = imageData !== undefined;

    return (
        <span className="relative inline-flex align-middle">
            <AvatarBase.Root
                ref={ref}
                className={resolveClassNames(
                    props.layoutClassName,
                    "inline-flex items-center justify-center overflow-hidden rounded-full",
                    SIZE_CLASSES[size],
                    {
                        "opacity-50": props.disabled,
                    },
                )}
                render={<span />}
                aria-disabled={props.disabled}
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
                    {userDataWithStatus.status === "rejected" ? (
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
                        "opacity-0": userDataWithStatus.status !== "loading" || imageLoadingStatus === "loaded",
                        "opacity-100": userDataWithStatus.status === "loading" && imageLoadingStatus !== "loaded",
                    },
                )}
            >
                <CircularProgress size={size} />
            </span>
        </span>
    );
});
