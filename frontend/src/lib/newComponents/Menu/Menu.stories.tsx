import { ArrowDownward, Circle, Square, Star } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import type { SelectableSize } from "../_shared/utils/size";
import { Button } from "../Button";

import type { MenuPopupProps } from ".";
import { Menu } from ".";

type RootPropsAndCustomArgs = React.ComponentProps<typeof Menu.Root> & {
    itemSize?: SelectableSize;
    side: MenuPopupProps["side"];
    align: MenuPopupProps["align"];
};

const meta: Meta<RootPropsAndCustomArgs> = {
    title: "Components/Menu",
    component: Menu.Root,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
    },

    args: {
        itemSize: "default",
        disabled: false,
    },
    argTypes: {
        itemSize: {
            control: "select",
            options: ["small", "default", "large"],
        },
        side: {
            control: "select",
            options: ["top", "right", "bottom", "left"],
        },
        align: {
            control: "select",
            options: ["start", "center", "end"],
        },
        disabled: {
            control: "boolean",
        },
    },
};

export default meta;
type Story = StoryObj<RootPropsAndCustomArgs>;

export const Default: Story = {
    render: ({ side, align, itemSize, ...rootArgs }) => (
        <Menu.Root {...rootArgs}>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup side={side} align={align} itemSize={itemSize}>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item disabled>Option 2</Menu.Item>
                <Menu.Item>Option 3</Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const Sizes: Story = {
    render: ({ side, align, ...rootArgs }) => (
        <div className="gap-horizontal-sm flex items-center">
            <Menu.Root {...rootArgs}>
                <Menu.Trigger>
                    <Button size="small">
                        Small <ArrowDownward fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
                <Menu.Popup side={side} align={align} itemSize="small">
                    <Menu.Item>Option 1</Menu.Item>
                    <Menu.Item>Option 2</Menu.Item>
                    <Menu.Item>Option 3</Menu.Item>
                </Menu.Popup>
            </Menu.Root>

            <Menu.Root {...rootArgs}>
                <Menu.Trigger>
                    <Button size="default">
                        Medium <ArrowDownward fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
                <Menu.Popup side={side} align={align} itemSize="default">
                    <Menu.Item>Option 1</Menu.Item>
                    <Menu.Item>Option 2</Menu.Item>
                    <Menu.Item>Option 3</Menu.Item>
                </Menu.Popup>
            </Menu.Root>

            <Menu.Root {...rootArgs}>
                <Menu.Trigger>
                    <Button size="large">
                        Open menu <ArrowDownward fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
                <Menu.Popup side={side} align={align} itemSize="large">
                    <Menu.Item>Option 1</Menu.Item>
                    <Menu.Item>Option 2</Menu.Item>
                    <Menu.Item>Option 3</Menu.Item>
                </Menu.Popup>
            </Menu.Root>
        </div>
    ),
};

export const ComplexItems: Story = {
    render: ({ side, align, itemSize, ...rootArgs }) => (
        <Menu.Root {...rootArgs}>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup side={side} align={align} itemSize={itemSize}>
                <Menu.Item
                    icon={<Star fontSize="inherit" />}
                    description="Option 1 is a thing indeed, and it's using the built in icon and description props"
                >
                    Option 1
                </Menu.Item>
                <Menu.Item icon={<Circle fontSize="inherit" />} description="Option 1 is a thing indeed">
                    Option 2
                </Menu.Item>
                <Menu.Item
                    disabled
                    icon={<Square fontSize="inherit" />}
                    description="Option 1 is a thing indeed. Commodo adipisicing ad magna aliqua. Minim aliqua id est amet mollit. Excepteur occaecat elit id magna consectetur aliquip culpa laborum enim adipisicing ex deserunt. Reprehenderit reprehenderit voluptate sunt labore commodo esse eu enim cillum enim enim consectetur amet. Eu aliqua laboris elit do voluptate elit. Id ipsum non et irure. Eu aliqua id proident nostrud aute eu amet."
                >
                    Option 3
                </Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const SubMenu: Story = {
    render: ({ side, align, itemSize, ...rootArgs }) => (
        <Menu.Root {...rootArgs}>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup side={side} align={align} itemSize={itemSize}>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item>Option 2</Menu.Item>
                <Menu.Separator />
                <Menu.SubmenuItem triggerContent={"Sub menu"}>
                    <Menu.Item>Option 3</Menu.Item>
                    <Menu.Item>Option 4</Menu.Item>
                    <Menu.Item>Option 5</Menu.Item>
                </Menu.SubmenuItem>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const WithCheckboxItems: Story = {
    render: ({ side, align, itemSize, ...rootArgs }) => (
        <Menu.Root {...rootArgs}>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup side={side} align={align} itemSize={itemSize}>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item>Option 2</Menu.Item>

                <Menu.Separator />

                <Menu.Group>
                    <Menu.GroupLabel>Checkbox items</Menu.GroupLabel>

                    <Menu.CheckboxItem>Option 3</Menu.CheckboxItem>
                    <Menu.CheckboxItem disabled>Option 4</Menu.CheckboxItem>
                    <Menu.CheckboxItem>Option 5</Menu.CheckboxItem>
                </Menu.Group>
                <Menu.Separator />
                <Menu.RadioGroup>
                    <Menu.GroupLabel>Radio items</Menu.GroupLabel>

                    <Menu.RadioItem value={1}>Option 6</Menu.RadioItem>
                    <Menu.RadioItem disabled value={2}>
                        Option 7
                    </Menu.RadioItem>
                    <Menu.RadioItem value={3}>Option 8</Menu.RadioItem>
                </Menu.RadioGroup>
            </Menu.Popup>
        </Menu.Root>
    ),
};
