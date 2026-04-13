export {
    Strategy,
    acceptConnection,
    disconnect,
    isPlayServicesAvailable,
    onConnected,
    onDisconnected,
    onInvitationReceived,
    onPeerFound,
    onPeerLost,
    onTextReceived,
    rejectConnection,
    requestConnection,
    sendText,
    startAdvertise,
    startDiscovery,
    stopAdvertise,
    stopDiscovery
} from "expo-nearby-connections";

export type {
    Connected,
    Disconnected,
    InvitationReceived,
    OnConnected,
    OnDisconnected,
    OnInvitationReceived,
    OnPeerFound,
    OnPeerLost,
    OnTextReceived,
    PeerFound,
    PeerLost,
    TextReceived
} from "expo-nearby-connections";

