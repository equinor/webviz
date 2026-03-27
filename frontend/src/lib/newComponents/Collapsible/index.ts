import { Group } from "./_components/group";
import { ScrollArea } from "./_components/scrollArea";
import { GroupProps } from "./_components/group";
import { ScrollAreaProps } from "./_components/scrollArea";
import { Content, ContentProps } from "./_components/content";

export const Collapsible = {
    Group,
    ScrollArea,
    Content,
};

export type CollapsibleProps = {
    Group: GroupProps;
    ScrollArea: ScrollAreaProps;
    Content: ContentProps;
};
