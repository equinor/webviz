import { Button as ButtonBase } from "./_components/button";
import { Group } from "./_components/group";

export type { ButtonProps } from "./_components/button";
export type { GroupProps as ButtonGroupProps } from "./_components/group";

export const Button = Object.assign(ButtonBase, { Group });
