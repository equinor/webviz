import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "./index";

const meta: Meta<typeof Avatar> = {
    title: "Components/Avatar",
    component: Avatar,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        size: {
            control: "select",
            options: ["small", "medium", "large"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const NoImage: Story = {
    args: {},
};

export const WithImage: Story = {
    args: {
        userData: {
            imageSrc: "https://i.pravatar.cc/150?img=3",
            alt: "User avatar",
        },
    },
};

export const WithInitials: Story = {
    args: {
        userData: {
            imageSrc: "https://i.pravatar.cc/150?img=5",
            alt: "Jane Doe",
            initials: "JD",
        },
    },
};

export const AsyncImage: Story = {
    args: {
        userData: () =>
            new Promise((resolve) =>
                setTimeout(
                    () =>
                        resolve({
                            imageSrc: "https://i.pravatar.cc/150?img=7",
                            alt: "Async user",
                            initials: "AU",
                        }),
                    1500,
                ),
            ),
    },
};

export const AsyncFailed: Story = {
    args: {
        userData: () => new Promise((_, reject) => setTimeout(reject, 1000)),
    },
};

export const InitialsFallback: Story = {
    name: "Broken Image with Initials Fallback",
    args: {
        userData: {
            imageSrc: "https://example.invalid/broken.jpg",
            alt: "Broken image",
            initials: "AB",
        },
    },
};

export const Small: Story = {
    args: {
        size: "small",
        userData: {
            imageSrc: "https://i.pravatar.cc/150?img=3",
            alt: "User avatar",
            initials: "SM",
        },
    },
};

export const Medium: Story = {
    args: {
        size: "medium",
        userData: {
            imageSrc: "https://i.pravatar.cc/150?img=3",
            alt: "User avatar",
            initials: "MD",
        },
    },
};

export const Large: Story = {
    args: {
        size: "large",
        userData: {
            imageSrc: "https://i.pravatar.cc/150?img=3",
            alt: "User avatar",
            initials: "LG",
        },
    },
};
