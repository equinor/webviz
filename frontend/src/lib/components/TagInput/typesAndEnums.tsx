/**
 * Properties passed to rendered tags. Every property is provided by the TagInput's renderTag function
 */
export interface TagProps {
    /** The tag value to display */
    tag: string;
    label?: string;
    /** The separator string used by the input */
    separator: string;
    /** Whether or not this tag is currently focused by the tag-input */
    focused: boolean;
    /** Whether or not this tag is being selected by the tag-input */
    selected: boolean;
    /** The direction used when focus/select was last moved */
    focusMovementDirection: Direction;
    /** Callback to remove this tag from the list */
    onRemove: () => void;
    /** Callback to move the TagInput's selecting to this tag. */
    onFocus: () => void;
    /** Callback to update this tag's value */
    onChange: (newTag: string) => void;
    /** Callback to move the TagInput's selection, relative to the current position */
    onMoveFocus: (step: Direction, isSelecting?: boolean) => void;
}

/**
 * Tag selection movement.
 * The numeric values are intentionally set for use in incrementing/decrementing indices.
 */
export enum Direction {
    Backwards = -1, // Used to decrement index
    None = 0, // No movement
    Forwards = 1, // Used to increment index
}
