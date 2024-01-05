import { ChannelReceiverChannelContent } from "@framework/DataChannelTypes";

export function makePlotTitle(content: ChannelReceiverChannelContent<any>): string {
    let title = "";

    if (content.metaData.displayString) {
        title = content.metaData.displayString;
    } else {
        title = content.displayName;
    }

    if (content.metaData.unit) {
        title += `<br>[${content.metaData.unit}]`;
    }

    return title;
}
