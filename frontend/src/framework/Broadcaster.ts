export type BroadcastChannelMeta = {
    [name: string]: any;
};

export class BroadcastChannel<D> {
    private _name: string;
    private _subscribers: Set<(data: D) => void>;
    private _cachedData: D | null;

    constructor(name: string) {
        this._name = name;
        this._subscribers = new Set();
        this._cachedData = null;
    }

    public getName() {
        return this._name;
    }

    public broadcast(data: D) {
        this._cachedData = data;

        for (const cb of this._subscribers) {
            cb(data);
        }
    }

    public subscribe(cb: (data: D) => void) {
        this._subscribers.add(cb);

        if (this._cachedData) {
            cb(this._cachedData);
        }

        return () => {
            this._subscribers.delete(cb);
        };
    }
}

class Broadcaster {
    private _channels: BroadcastChannel<any>[] = [];

    public registerChannel<D>(channelName: string): BroadcastChannel<D> {
        const channel = new BroadcastChannel<D>(channelName);
        this._channels.push(channel);
        return channel;
    }

    public broadcast(channelName: string, data: any) {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return;
        }

        channel.broadcast(data);
    }

    public getChannel(channelName: string): BroadcastChannel<any> | null {
        const channel = this._channels.find((c) => c.getName() === channelName);
        if (!channel) {
            return null;
        }

        return channel;
    }
}

export const broadcaster = new Broadcaster();
