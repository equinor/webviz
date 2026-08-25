import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

/**
 * Maps a module instance id to the DOM node currently available to portal that module's view
 * content into. Lets a module's view content stay mounted continuously (preserving any WebGL
 * canvas/context it owns) while its surrounding chrome (header, positioning) moves between an
 * active dashboard's interactive Layout and a hidden holding pen for hot-but-inactive dashboards -
 * see ModuleViewContentHost, which owns the persistent view content and portals it into whichever
 * slot is currently registered.
 *
 * Module instance ids are used directly as topic keys - PublishSubscribeDelegate's topic type is
 * already `Record<string, any>`, so no fixed topic enum is needed here.
 */
export class ModuleViewSlotRegistry implements PublishSubscribe<Record<string, HTMLElement | null>> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<Record<string, HTMLElement | null>>();
    private _slots = new Map<string, HTMLElement>();

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<Record<string, HTMLElement | null>> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter(moduleInstanceId: string): () => HTMLElement | null {
        return () => this._slots.get(moduleInstanceId) ?? null;
    }

    setSlot(moduleInstanceId: string, element: HTMLElement | null): void {
        if (element) {
            this._slots.set(moduleInstanceId, element);
        } else {
            this._slots.delete(moduleInstanceId);
        }
        this._publishSubscribeDelegate.notifySubscribers(moduleInstanceId);
    }
}
