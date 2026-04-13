import { Platform } from "react-native";

import type {
    Connected,
    Disconnected,
    InvitationReceived,
    PeerFound,
    PeerLost,
    TextReceived,
} from "expo-nearby-connections";

type NearbyConnectionsModule = typeof import("expo-nearby-connections");
type UnsubscribeCallback = () => void;

const nativeNearby =
  Platform.OS === "web"
    ? null
    : (require("expo-nearby-connections") as NearbyConnectionsModule);

export enum Strategy {
  P2P_CLUSTER = 1,
  P2P_STAR = 2,
  P2P_POINT_TO_POINT = 3,
}

const unsupportedMessage =
  "Nearby connections is only available on Android and iOS.";

const unsupported = async (): Promise<never> => {
  throw new Error(unsupportedMessage);
};

const noopSubscription = (): UnsubscribeCallback => {
  return () => undefined;
};

export type {
    Connected,
    Disconnected,
    InvitationReceived,
    PeerFound,
    PeerLost,
    TextReceived
};

export const isPlayServicesAvailable = async (): Promise<boolean> => {
  return nativeNearby ? nativeNearby.isPlayServicesAvailable() : false;
};

export const startAdvertise = async (
  name: string,
  strategy: Strategy = Strategy.P2P_STAR,
): Promise<string> => {
  return nativeNearby
    ? nativeNearby.startAdvertise(name, strategy)
    : unsupported();
};

export const stopAdvertise = async (): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.stopAdvertise();
  }
};

export const startDiscovery = async (
  name: string,
  strategy: Strategy = Strategy.P2P_STAR,
): Promise<string> => {
  return nativeNearby
    ? nativeNearby.startDiscovery(name, strategy)
    : unsupported();
};

export const stopDiscovery = async (): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.stopDiscovery();
  }
};

export const requestConnection = async (
  advertisePeerId: string,
): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.requestConnection(advertisePeerId);
    return;
  }

  await unsupported();
};

export const acceptConnection = async (targetPeerId: string): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.acceptConnection(targetPeerId);
    return;
  }

  await unsupported();
};

export const rejectConnection = async (targetPeerId: string): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.rejectConnection(targetPeerId);
    return;
  }

  await unsupported();
};

export const disconnect = async (connectedPeerId?: string): Promise<void> => {
  if (!nativeNearby) {
    return;
  }

  if (Platform.OS === "ios") {
    await nativeNearby.disconnect();
    return;
  }

  if (connectedPeerId) {
    await nativeNearby.disconnect(connectedPeerId);
  }
};

export const sendText = async (
  connectedPeerId: string,
  text: string,
): Promise<void> => {
  if (nativeNearby) {
    await nativeNearby.sendText(connectedPeerId, text);
    return;
  }

  await unsupported();
};

export const onInvitationReceived = (
  callback: (data: InvitationReceived) => void,
): UnsubscribeCallback => {
  return nativeNearby
    ? nativeNearby.onInvitationReceived(callback)
    : noopSubscription();
};

export const onConnected = (
  callback: (data: Connected) => void,
): UnsubscribeCallback => {
  return nativeNearby ? nativeNearby.onConnected(callback) : noopSubscription();
};

export const onDisconnected = (
  callback: (data: Disconnected) => void,
): UnsubscribeCallback => {
  return nativeNearby
    ? nativeNearby.onDisconnected(callback)
    : noopSubscription();
};

export const onPeerFound = (
  callback: (data: PeerFound) => void,
): UnsubscribeCallback => {
  return nativeNearby ? nativeNearby.onPeerFound(callback) : noopSubscription();
};

export const onPeerLost = (
  callback: (data: PeerLost) => void,
): UnsubscribeCallback => {
  return nativeNearby ? nativeNearby.onPeerLost(callback) : noopSubscription();
};

export const onTextReceived = (
  callback: (data: TextReceived) => void,
): UnsubscribeCallback => {
  return nativeNearby
    ? nativeNearby.onTextReceived(callback)
    : noopSubscription();
};
