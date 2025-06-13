/**
 * A tag object
 */
export type Tag = {
    /** A unique identifier for the tag */
    id: string;
    /** The tag's value. Is shown in the tag list */
    value: string;
};

/**
 * Properties to include when creating a custom tag component implementation. Every property is provided by the
 * TagInput's renderTag function
 */
export interface TagProps {
    /** The tag value to display */
    tag: Tag;
    /** The separator string used by the input */
    separator?: string;
    /** Whether or not this tag is currently focused by the tag-input */
    focused?: boolean;
    /** Whether or not this tag is being selected by the tag-input */
    selected?: boolean;
    /** The direction used when focus/select was last moved */
    focusMovementDirection: Direction;
    /** Callback to remove this tag from the list */
    onRemove?: () => void;
    /** Callback to move the TagInput's selecting to this tag. */
    onFocus?: () => void;
    /** Callback to update this tag's value */
    onChange?: (newTag: Tag) => void;
    /** Callback to move the TagInput's selection, relative to the current position */
    onMoveFocus?: (step: Direction, isSelecting?: boolean) => void;
}

/**
 * Tag selection movement
 */
export enum Direction {
    Backwards = -1,
    None = 0,
    Forwards = 1,
}
