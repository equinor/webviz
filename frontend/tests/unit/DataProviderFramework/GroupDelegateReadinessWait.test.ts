import { describe, expect, test, vi } from "vitest";

import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import type { ItemDelegate } from "@modules/_shared/DataProviderFramework/delegates/ItemDelegate";
import {
    DataProviderStatus,
    DataProviderTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import type { SerializedItem } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";

// Same brand as DataProvider uses, so isDataProvider() picks up the fakes
const DATA_PROVIDER_BRAND = Symbol.for("dpf/data-provider");

function makeFakeItemDelegate(id: string): ItemDelegate {
    const publishSubscribeDelegate = new PublishSubscribeDelegate();
    return {
        getId: () => id,
        getOrder: () => 0,
        setParentGroup: () => {},
        getPublishSubscribeDelegate: () => publishSubscribeDelegate,
    } as unknown as ItemDelegate;
}

// Just enough of a DataProvider for the readiness wait: the brand, a status, whether a refetch is scheduled and STATUS
// notifications.
class FakeProvider implements Item {
    readonly [DATA_PROVIDER_BRAND] = true;
    private _status: DataProviderStatus;
    private _isFetchScheduled = false;
    private _itemDelegate: ItemDelegate;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<{
        [DataProviderTopic.STATUS]: DataProviderStatus;
    }>();

    constructor(id: string, status: DataProviderStatus = DataProviderStatus.LOADING) {
        this._itemDelegate = makeFakeItemDelegate(id);
        this._status = status;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getStatus(): DataProviderStatus {
        return this._status;
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    setStatus(status: DataProviderStatus): void {
        this._status = status;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS);
    }

    isFetchScheduled(): boolean {
        return this._isFetchScheduled;
    }

    // Like the real provider, published on the status topic although the status doesn't change
    setFetchScheduled(isFetchScheduled: boolean): void {
        this._isFetchScheduled = isFetchScheduled;
        this._publishSubscribeDelegate.notifySubscribers(DataProviderTopic.STATUS);
    }

    serializeState(): SerializedItem {
        throw new Error("Not implemented");
    }

    deserializeState(): void {}
}

class FakeGroup implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(id: string) {
        this._itemDelegate = makeFakeItemDelegate(id);
        this._groupDelegate = new GroupDelegate(this);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    serializeState(): SerializedItem {
        throw new Error("Not implemented");
    }

    deserializeState(): void {}
}

function makeGroup(...children: Item[]): GroupDelegate {
    const group = new GroupDelegate(null);
    for (const child of children) {
        group.appendChild(child);
    }
    return group;
}

describe("GroupDelegate.waitUntilAllDescendantDataProvidersAreReady", () => {
    test("calls back immediately when no provider is pending", () => {
        const group = makeGroup(new FakeProvider("a", DataProviderStatus.SUCCESS));
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("calls back once, when all providers have settled", () => {
        const a = new FakeProvider("a");
        const b = new FakeProvider("b");
        const group = makeGroup(a, b);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).not.toHaveBeenCalled();

        b.setStatus(DataProviderStatus.ERROR);
        expect(callback).toHaveBeenCalledTimes(1);

        a.setStatus(DataProviderStatus.LOADING);
        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("does not wait for a provider that is removed while loading", () => {
        const a = new FakeProvider("a");
        const b = new FakeProvider("b");
        const group = makeGroup(a, b);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        a.setStatus(DataProviderStatus.SUCCESS);
        group.removeChild(b);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("does not wait for providers in a nested group that is removed while they are loading", () => {
        const a = new FakeProvider("a");
        const nestedGroup = new FakeGroup("nested");
        nestedGroup.getGroupDelegate().appendChild(new FakeProvider("b"));
        const group = makeGroup(a, nestedGroup);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).not.toHaveBeenCalled();

        group.removeChild(nestedGroup);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("waits for a provider that is added while waiting", () => {
        const a = new FakeProvider("a");
        const group = makeGroup(a);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        const c = new FakeProvider("c");
        group.appendChild(c);
        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).not.toHaveBeenCalled();

        c.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("waits for a provider that starts loading again before the others have settled", () => {
        const a = new FakeProvider("a");
        const b = new FakeProvider("b");
        const group = makeGroup(a, b);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        a.setStatus(DataProviderStatus.SUCCESS);
        a.setStatus(DataProviderStatus.LOADING);
        b.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).not.toHaveBeenCalled();

        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("waits for a provider with a scheduled refetch, although its status still shows it as settled", () => {
        const a = new FakeProvider("a", DataProviderStatus.SUCCESS);
        const b = new FakeProvider("b");
        const group = makeGroup(a, b);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        a.setFetchScheduled(true);
        b.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).not.toHaveBeenCalled();

        // The fetch starts - LOADING before the schedule is cleared, as the real provider does it
        a.setStatus(DataProviderStatus.LOADING);
        a.setFetchScheduled(false);
        expect(callback).not.toHaveBeenCalled();

        a.setStatus(DataProviderStatus.SUCCESS);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("calls back when a scheduled refetch is dropped without its status ever changing", () => {
        const a = new FakeProvider("a", DataProviderStatus.SUCCESS);
        const group = makeGroup(a);
        a.setFetchScheduled(true);
        const callback = vi.fn();

        group.waitUntilAllDescendantDataProvidersAreReady(callback);
        expect(callback).not.toHaveBeenCalled();

        a.setFetchScheduled(false);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("never calls back after being cancelled", () => {
        const a = new FakeProvider("a");
        const group = makeGroup(a);
        const callback = vi.fn();

        const cancel = group.waitUntilAllDescendantDataProvidersAreReady(callback);
        cancel();
        a.setStatus(DataProviderStatus.SUCCESS);

        expect(callback).not.toHaveBeenCalled();
    });
});
