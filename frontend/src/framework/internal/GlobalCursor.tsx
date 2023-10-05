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

    private updateBodyCursor() {
        if (this._lastCursor !== GlobalCursorType.Default) {
            const oldCursorClass = `cursor-${this._lastCursor}`;
            document.body.classList.remove(oldCursorClass);
        }

        if (this._cursorStack.length === 0) {
            this._lastCursor = GlobalCursorType.Default;
            return;
        }

        const newCursor = this._cursorStack[this._cursorStack.length - 1];
        const newCursorClass = `cursor-${newCursor}`;
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
