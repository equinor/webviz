export enum GlobalCursorType {
    Default = "default",
    Copy = "copy",
    Pointer = "pointer",
    Grab = "grab",
    Grabbing = "grabbing",
    Crosshair = "crosshair",
    Move = "move",
    Text = "text",
    Wait = "wait",
    Help = "help",
    Progress = "progress",
    Cell = "cell",
    VerticalText = "vertical-text",
    Alias = "alias",
    ContextMenu = "context-menu",
    NoDrop = "no-drop",
    NotAllowed = "not-allowed",
}

export class GlobalCursor {
    private _cursorStack: GlobalCursorType[];
    private _lastCursor: GlobalCursorType = GlobalCursorType.Default;

    constructor() {
        this._cursorStack = [];
    }

    private getCursorClassName(cursorType: GlobalCursorType) {
        switch (cursorType) {
            case GlobalCursorType.Default:
                return "cursor-default";
            case GlobalCursorType.Copy:
                return "cursor-copy";
            case GlobalCursorType.Pointer:
                return "cursor-pointer";
            case GlobalCursorType.Grab:
                return "cursor-grab";
            case GlobalCursorType.Grabbing:
                return "cursor-grabbing";
            case GlobalCursorType.Crosshair:
                return "cursor-crosshair";
            case GlobalCursorType.Move:
                return "cursor-move";
            case GlobalCursorType.Text:
                return "cursor-text";
            case GlobalCursorType.Wait:
                return "cursor-wait";
            case GlobalCursorType.Help:
                return "cursor-help";
            case GlobalCursorType.Progress:
                return "cursor-progress";
            case GlobalCursorType.Cell:
                return "cursor-cell";
            case GlobalCursorType.VerticalText:
                return "cursor-vertical-text";
            case GlobalCursorType.Alias:
                return "cursor-alias";
            case GlobalCursorType.ContextMenu:
                return "cursor-context-menu";
            case GlobalCursorType.NoDrop:
                return "cursor-no-drop";
            case GlobalCursorType.NotAllowed:
                return "cursor-not-allowed";
            default:
                return "cursor-default";
        }
    }

    private updateBodyCursor() {
        if (this._lastCursor !== GlobalCursorType.Default) {
            const oldCursorClass = this.getCursorClassName(this._lastCursor);
            document.body.classList.remove(oldCursorClass);
        }

        if (this._cursorStack.length === 0) {
            this._lastCursor = GlobalCursorType.Default;
            return;
        }

        const newCursor = this._cursorStack[this._cursorStack.length - 1];
        const newCursorClass = this.getCursorClassName(newCursor);
        document.body.classList.add(newCursorClass);
        this._lastCursor = newCursor;
    }

    setOverrideCursor(cursorType: GlobalCursorType) {
        this._cursorStack.push(cursorType);
        this.updateBodyCursor();
    }

    restoreOverrideCursor() {
        if (this._cursorStack.length > 0) {
            this._cursorStack.pop();
            this.updateBodyCursor();
        }
    }

    changeOverrideCursor(cursorType: GlobalCursorType) {
        if (this._cursorStack.length > 0) {
            this._cursorStack.pop();
        }
        this._cursorStack.push(cursorType);
        this.updateBodyCursor();
    }
}
