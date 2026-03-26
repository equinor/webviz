import React from "react";

import { Avatar as AvatarBase } from "@base-ui/react/avatar";
import PersonIcon from "@mui/icons-material/Person";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type AvatarUserData = {
    imageSrc?: string;
    initials?: string;
    title?: string;
    alt?: string;
};

export type AvatarProps = {
    image?: AvatarUserData | (() => Promise<AvatarUserData>);
    size?: "small" | "medium" | "large";
};

type ImageState =
    | { status: "direct"; data: AvatarUserData }
    | { status: "loading" }
    | { status: "loaded"; data: AvatarUserData }
    | { status: "rejected" };

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
    small: "h-8 aspect-square text-body-md tracking-body-md-tight",
    medium: "h-12 aspect-square text-body-xl tracking-body-xl-tight",
    large: "h-16 aspect-square text-body-4xl tracking-body-4xl-tight",
};

const DEFAULT_PROPS = {
    size: "medium",
} satisfies Partial<AvatarProps>;

export function Avatar(props: AvatarProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const { image } = defaultedProps;

    const [imageState, setImageState] = React.useState<ImageState>(() => {
        if (image && typeof image !== "function") return { status: "direct", data: image };
        if (typeof image === "function") return { status: "loading" };
        return { status: "rejected" };
    });

    React.useEffect(
        function loadImageEffect() {
            if (image && typeof image !== "function") {
                setImageState({ status: "direct", data: image });
                return;
            }
            if (typeof image === "function") {
                let isMounted = true;
                setImageState({ status: "loading" });
                image()
                    .then((data) => {
                        if (isMounted) setImageState({ status: "loaded", data });
                    })
                    .catch(() => {
                        if (isMounted) setImageState({ status: "rejected" });
                    });
                return () => {
                    isMounted = false;
                };
            }
            setImageState({ status: "rejected" });
        },
        [image],
    );

    const imageData = imageState.status === "direct" || imageState.status === "loaded" ? imageState.data : undefined;

    const showImage = imageData !== undefined;

    return (
        <span className="relative inline-flex align-middle">
            <AvatarBase.Root
                className={resolveClassNames(
                    "inline-flex items-center justify-center overflow-hidden rounded-full",
                    SIZE_CLASSES[defaultedProps.size],
                )}
                render={<span />}
            >
                {showImage && (
                    <AvatarBase.Image
                        src={imageData.imageSrc}
                        alt={imageData.alt}
                        className="h-full w-full object-cover"
                        render={<img />}
                    />
                )}
                <AvatarBase.Fallback
                    className={resolveClassNames(
                        "bg-fill-neutral text-text-neutral-subtle flex h-full w-full items-center justify-center leading-px font-medium uppercase",
                        {},
                    )}
                    render={<span />}
                >
                    {imageState.status === "rejected" ? (
                        <PersonIcon fontSize="inherit" />
                    ) : (
                        (imageData?.initials ?? <PersonIcon fontSize="inherit" />)
                    )}
                </AvatarBase.Fallback>
            </AvatarBase.Root>
            {imageState.status === "loading" && (
                <span
                    className={resolveClassNames(
                        "border-t-stroke-accent-strong pointer-events-none absolute inset-0 animate-spin rounded-full border-4 border-transparent",
                    )}
                />
            )}
        </span>
    );
}
