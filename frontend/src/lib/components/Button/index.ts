import { Button as ButtonBase } from "./_components/button";
import { Group } from "./_components/group";
import { LinkButton as AsLink } from "./_components/linkButton";

export type { ButtonProps } from "./_components/button";

export type { LinkButtonProps as ButtonAsLinkProps } from "./_components/linkButton";
export type { GroupProps as ButtonGroupProps } from "./_components/group";

export const Button = Object.assign(ButtonBase, { Group, AsLink });
