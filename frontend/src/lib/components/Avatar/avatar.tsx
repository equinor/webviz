import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Avatar } from "@base-ui/react/avatar";
import PersonIcon from "@mui/icons-material/Person";
import React from "react";

export type AvatarImageData = {
    src: string;
    initials?: string;
};

export type AvatarProps = {
    image?: AvatarImageData | (() => Promise<AvatarImageData>);
    size?: "small" | "medium" | "large";
    alt?: string;
};

type ImageState =
    | { status: "direct"; data: AvatarImageData }
    | { status: "loading" }
    | { status: "loaded"; data: AvatarImageData }
    | { status: "rejected" };

const DEFAULT_PROPS = {
    size: "medium",
};

export function MyAvatar(props: AvatarProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    const [imageState, setImageState] = React.useState<ImageState>(() => {
        if (defaultedProps.image && typeof defaultedProps.image !== "function")
            return { status: "direct", data: defaultedProps.image };
        if (typeof defaultedProps.image === "function") return { status: "loading" };
        return { status: "rejected" };
    });

    React.useEffect(() => {
        if (defaultedProps.image && typeof defaultedProps.image !== "function") {
            setImageState({ status: "direct", data: defaultedProps.image });
            return;
        }
        if (typeof defaultedProps.image === "function") {
            let isMounted = true;
            setImageState({ status: "loading" });
            defaultedProps
                .image()
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
    }, [defaultedProps.image]);

    const imageData = imageState.status === "direct" || imageState.status === "loaded" ? imageState.data : undefined;

    const showImage = imageData !== undefined;

    return (
        <Avatar.Root
            className={resolveClassNames("overflow-hidden rounded-full", {
                "h-8 w-8 text-sm": defaultedProps.size === "small",
                "h-10 w-10 text-base": defaultedProps.size === "medium",
                "h-14 w-14 text-xl": defaultedProps.size === "large",
            })}
            render={<span />}
        >
            {showImage && (
                <Avatar.Image
                    src={imageData.src}
                    alt={defaultedProps.alt}
                    className="h-full w-full object-cover"
                    render={<img />}
                />
            )}
            <Avatar.Fallback
                className={resolveClassNames(
                    "flex h-full w-full items-center justify-center bg-gray-300 font-medium text-gray-700 uppercase",
                    {},
                )}
                render={<span />}
            >
                {imageState.status === "rejected" ? (
                    <PersonIcon fontSize="inherit" />
                ) : (
                    (imageData?.initials ?? <PersonIcon fontSize="inherit" />)
                )}
            </Avatar.Fallback>
        </Avatar.Root>
    );
}
