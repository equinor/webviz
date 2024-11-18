export class UnsubscribeHandlerDelegate {
    private _subscriptions: Map<string, Set<() => void>> = new Map();

    registerUnsubscribeFunction(topic: string, callback: () => void): void {
        let subscriptionsSet = this._subscriptions.get(topic);
        if (!subscriptionsSet) {
            subscriptionsSet = new Set();
            this._subscriptions.set(topic, subscriptionsSet);
        }
        subscriptionsSet.add(callback);
    }

    unsubscribe(topic: string): void {
        const subscriptionsSet = this._subscriptions.get(topic);
        if (subscriptionsSet) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
            this._subscriptions.delete(topic);
        }
    }

    unsubscribeAll(): void {
        for (const subscriptionsSet of this._subscriptions.values()) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
        }
    }
}
