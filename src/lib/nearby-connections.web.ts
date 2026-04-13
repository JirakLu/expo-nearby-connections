export enum Strategy {
  P2P_CLUSTER = 1,
  P2P_STAR = 2,
  P2P_POINT_TO_POINT = 3,
}

export type BasePeer = {
  peerId: string;
  name: string;
};

export type PeerFound = BasePeer;
export type PeerLost = Pick<BasePeer, "peerId">;
export type InvitationReceived = BasePeer;
export type Connected = BasePeer;
export type Disconnected = Pick<BasePeer, "peerId">;
export type TextReceived = Pick<BasePeer, "peerId"> & {
  text: string;
};

const unsupportedMessage =
  "Nearby connections is only available on Android and iOS.";

const unsupported = async (): Promise<never> => {
  throw new Error(unsupportedMessage);
};

const createNoopSubscription = () => {
  return () => undefined;
};

export const isPlayServicesAvailable = async (): Promise<boolean> => false;

export const startAdvertise = async (
  _name: string,
  _strategy: Strategy = Strategy.P2P_STAR,
) => {
  return unsupported();
};

export const stopAdvertise = async (): Promise<void> => undefined;

export const startDiscovery = async (
  _name: string,
  _strategy: Strategy = Strategy.P2P_STAR,
) => {
  return unsupported();
};

export const stopDiscovery = async (): Promise<void> => undefined;

export const requestConnection = async (
  _advertisePeerId: string,
): Promise<void> => unsupported();

export const acceptConnection = async (_targetPeerId: string): Promise<void> =>
  unsupported();

export const rejectConnection = async (_targetPeerId: string): Promise<void> =>
  unsupported();

export const disconnect = async (_connectedPeerId?: string): Promise<void> =>
  undefined;

export const sendText = async (
  _connectedPeerId: string,
  _text: string,
): Promise<void> => unsupported();

export const onInvitationReceived = (
  _callback: (data: InvitationReceived) => void,
) => {
  return createNoopSubscription();
};

export const onConnected = (_callback: (data: Connected) => void) => {
  return createNoopSubscription();
};

export const onDisconnected = (_callback: (data: Disconnected) => void) => {
  return createNoopSubscription();
};

export const onPeerFound = (_callback: (data: PeerFound) => void) => {
  return createNoopSubscription();
};

export const onPeerLost = (_callback: (data: PeerLost) => void) => {
  return createNoopSubscription();
};

export const onTextReceived = (_callback: (data: TextReceived) => void) => {
  return createNoopSubscription();
};
