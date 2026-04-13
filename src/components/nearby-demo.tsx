import React, { useEffect, useMemo, useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
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
    stopDiscovery,
    Strategy,
    type Connected,
    type InvitationReceived,
    type PeerFound,
} from "@/lib/nearby-connections";
import { ensureNearbyPermissions } from "@/lib/nearby-permissions";

type DemoRole = "host" | "client";

type NearbyDemoProps = {
  role: DemoRole;
  title: string;
  subtitle: string;
};

type ChatMessage = {
  id: string;
  direction: "incoming" | "outgoing" | "system";
  peerId: string;
  text: string;
};

const STRATEGY = Strategy.P2P_STAR;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createDeviceName = (role: DemoRole) => {
  const prefix = role === "host" ? "main-node" : "other-node";
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
};

const createMessage = (
  direction: ChatMessage["direction"],
  peerId: string,
  text: string,
): ChatMessage => ({
  id: makeId(),
  direction,
  peerId,
  text,
});

function ActionButton({
  disabled,
  label,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
}) {
  const theme = useTheme();

  const backgroundColor =
    variant === "primary"
      ? theme.text
      : variant === "danger"
        ? "#B93838"
        : theme.backgroundSelected;

  const textColor =
    variant === "primary" || variant === "danger"
      ? theme.background
      : theme.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View
        style={[
          styles.button,
          { backgroundColor, opacity: disabled ? 0.45 : 1 },
        ]}
      >
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function Card({ children }: React.PropsWithChildren) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {children}
    </ThemedView>
  );
}

export function NearbyDemo({ role, title, subtitle }: NearbyDemoProps) {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [deviceName, setDeviceName] = useState(() => createDeviceName(role));
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    role === "host"
      ? "Ready to advertise as the main node."
      : "Ready to scan for nearby main nodes.",
  );
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [pendingInvitation, setPendingInvitation] =
    useState<InvitationReceived | null>(null);
  const [discoveredPeers, setDiscoveredPeers] = useState<PeerFound[]>([]);
  const [connectedPeer, setConnectedPeer] = useState<Connected | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "system",
      "system",
      role === "host"
        ? "Start the main node, then open the Other Node tab on a second device to connect."
        : "Start scanning, choose a main node, then send a short test message after the connection is accepted.",
    ),
  ]);
  const [activity, setActivity] = useState<string[]>([]);

  const contentInsets = useMemo(() => {
    return {
      top: safeAreaInsets.top,
      left: safeAreaInsets.left,
      right: safeAreaInsets.right,
      bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
    };
  }, [
    safeAreaInsets.bottom,
    safeAreaInsets.left,
    safeAreaInsets.right,
    safeAreaInsets.top,
  ]);

  const appendActivity = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setActivity((current) => [`${timestamp}  ${text}`, ...current].slice(0, 8));
  };

  const appendSystemMessage = (text: string) => {
    setMessages((current) => [
      ...current,
      createMessage("system", "system", text),
    ]);
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    setErrorMessage(null);

    try {
      await action();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown nearby connection error.";
      setErrorMessage(message);
      appendActivity(`${label} failed`);
    } finally {
      setBusyAction(null);
    }
  };

  const ensureReady = async () => {
    const permissionResult = await ensureNearbyPermissions();

    if (!permissionResult.granted) {
      setErrorMessage(permissionResult.message ?? "Permission request failed.");
      return false;
    }

    if (Platform.OS === "android") {
      const playServicesAvailable = await isPlayServicesAvailable();

      if (!playServicesAvailable) {
        setErrorMessage(
          "Google Play Services is required on Android for Nearby Connections.",
        );
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    const unsubscribeConnected = onConnected((peer) => {
      setConnectedPeer(peer);
      setPendingInvitation(null);
      setStatusMessage(`Connected to ${peer.name}.`);
      appendActivity(`Connected to ${peer.name}`);
      appendSystemMessage(
        `Connected to ${peer.name}. You can send messages now.`,
      );
    });

    const unsubscribeDisconnected = onDisconnected(({ peerId }) => {
      setConnectedPeer((current) =>
        current?.peerId === peerId ? null : current,
      );
      setStatusMessage("Peer disconnected.");
      appendActivity(`Disconnected from ${peerId}`);
      appendSystemMessage(`Peer ${peerId} disconnected.`);
    });

    const unsubscribeText = onTextReceived(({ peerId, text }) => {
      setMessages((current) => [
        ...current,
        createMessage("incoming", peerId, text),
      ]);
      appendActivity(`Received a message from ${peerId}`);
    });

    const unsubscribeInvitation =
      role === "host"
        ? onInvitationReceived((invitation) => {
            setPendingInvitation(invitation);
            setStatusMessage(
              `Connection request received from ${invitation.name}.`,
            );
            appendActivity(`Invitation from ${invitation.name}`);
          })
        : () => undefined;

    const unsubscribePeerFound =
      role === "client"
        ? onPeerFound((peer) => {
            setDiscoveredPeers((current) => {
              const nextPeers = current.filter(
                (item) => item.peerId !== peer.peerId,
              );
              return [...nextPeers, peer];
            });
            appendActivity(`Found ${peer.name}`);
          })
        : () => undefined;

    const unsubscribePeerLost =
      role === "client"
        ? onPeerLost(({ peerId }) => {
            setDiscoveredPeers((current) =>
              current.filter((item) => item.peerId !== peerId),
            );
            appendActivity(`Lost ${peerId}`);
          })
        : () => undefined;

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeText();
      unsubscribeInvitation();
      unsubscribePeerFound();
      unsubscribePeerLost();

      if (role === "host") {
        void stopAdvertise();
      } else {
        void stopDiscovery();
      }
    };
  }, [role]);

  const handleStartSession = () => {
    void runAction(
      role === "host" ? "Start host" : "Start discovery",
      async () => {
        if (!(await ensureReady())) {
          return;
        }

        const trimmedName = deviceName.trim() || createDeviceName(role);

        if (role === "host") {
          const peerId = await startAdvertise(trimmedName, STRATEGY);
          setMyPeerId(peerId);
          setPendingInvitation(null);
          setDiscoveredPeers([]);
          setIsSessionActive(true);
          setStatusMessage(
            "Advertising as the main node. Waiting for other devices.",
          );
          appendActivity(`Advertising as ${trimmedName}`);
        } else {
          const peerId = await startDiscovery(trimmedName, STRATEGY);
          setMyPeerId(peerId);
          setDiscoveredPeers([]);
          setIsSessionActive(true);
          setStatusMessage("Scanning for nearby main nodes.");
          appendActivity(`Scanning as ${trimmedName}`);
        }
      },
    );
  };

  const handleStopSession = () => {
    void runAction(
      role === "host" ? "Stop host" : "Stop discovery",
      async () => {
        if (role === "host") {
          await stopAdvertise();
        } else {
          await stopDiscovery();
        }

        if (connectedPeer?.peerId) {
          await disconnect(connectedPeer.peerId);
        }

        setIsSessionActive(false);
        setConnectedPeer(null);
        setPendingInvitation(null);
        setDiscoveredPeers([]);
        setStatusMessage(
          role === "host" ? "Main node stopped." : "Discovery stopped.",
        );
        appendActivity(
          role === "host" ? "Stopped advertising" : "Stopped discovery",
        );
      },
    );
  };

  const handleAcceptInvitation = () => {
    if (!pendingInvitation) {
      return;
    }

    void runAction("Accept invitation", async () => {
      await acceptConnection(pendingInvitation.peerId);
      setStatusMessage(`Accepting ${pendingInvitation.name}.`);
      appendActivity(`Accepted ${pendingInvitation.name}`);
    });
  };

  const handleRejectInvitation = () => {
    if (!pendingInvitation) {
      return;
    }

    void runAction("Reject invitation", async () => {
      await rejectConnection(pendingInvitation.peerId);
      appendActivity(`Rejected ${pendingInvitation.name}`);
      appendSystemMessage(
        `Rejected connection from ${pendingInvitation.name}.`,
      );
      setPendingInvitation(null);
      setStatusMessage("Waiting for another connection request.");
    });
  };

  const handleRequestConnection = (peer: PeerFound) => {
    void runAction("Request connection", async () => {
      await requestConnection(peer.peerId);
      setStatusMessage(`Connection requested from ${peer.name}.`);
      appendActivity(`Requested ${peer.name}`);
    });
  };

  const handleDisconnect = () => {
    if (!connectedPeer) {
      return;
    }

    void runAction("Disconnect peer", async () => {
      await disconnect(connectedPeer.peerId);
      appendActivity(`Disconnected ${connectedPeer.name}`);
      setConnectedPeer(null);
      setStatusMessage("Disconnected from peer.");
    });
  };

  const handleSendMessage = () => {
    const message = draftMessage.trim();

    if (!connectedPeer || !message) {
      return;
    }

    void runAction("Send message", async () => {
      await sendText(connectedPeer.peerId, message);
      setMessages((current) => [
        ...current,
        createMessage("outgoing", connectedPeer.peerId, message),
      ]);
      setDraftMessage("");
      appendActivity(`Sent a message to ${connectedPeer.name}`);
    });
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={contentInsets}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Platform.OS === "web" ? Spacing.six : contentInsets.top,
          paddingBottom:
            Platform.OS === "web" ? Spacing.four : contentInsets.bottom,
          paddingLeft: contentInsets.left + Spacing.three,
          paddingRight: contentInsets.right + Spacing.three,
        },
      ]}
    >
      <View style={styles.innerContainer}>
        <Card>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
            </View>
            <ThemedView type="backgroundSelected" style={styles.roleBadge}>
              <ThemedText type="smallBold">
                {role === "host" ? "Main node" : "Other node"}
              </ThemedText>
            </ThemedView>
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Device identity</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Use different names on each phone so discovery and chat logs stay
              readable.
            </ThemedText>
          </View>

          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder={
              role === "host" ? "main-node-alpha" : "other-node-beta"
            }
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>

        <Card>
          <View style={styles.statusGrid}>
            <View style={styles.statusBlock}>
              <ThemedText type="smallBold">Session</ThemedText>
              <ThemedText>{isSessionActive ? "Running" : "Stopped"}</ThemedText>
            </View>
            <View style={styles.statusBlock}>
              <ThemedText type="smallBold">Your peer ID</ThemedText>
              <ThemedText type="code">
                {myPeerId ?? "Not started yet"}
              </ThemedText>
            </View>
            <View style={styles.statusBlock}>
              <ThemedText type="smallBold">Connection</ThemedText>
              <ThemedText>
                {connectedPeer ? connectedPeer.name : "No active peer"}
              </ThemedText>
            </View>
          </View>

          <ThemedView type="backgroundSelected" style={styles.statusBanner}>
            <ThemedText>{statusMessage}</ThemedText>
          </ThemedView>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <ThemedText type="smallBold" style={styles.errorText}>
                {errorMessage}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <ActionButton
              disabled={Boolean(busyAction) || isSessionActive}
              label={role === "host" ? "Start main node" : "Start scanning"}
              onPress={handleStartSession}
            />
            <ActionButton
              disabled={Boolean(busyAction) || !isSessionActive}
              label={role === "host" ? "Stop main node" : "Stop scanning"}
              onPress={handleStopSession}
              variant="secondary"
            />
            <ActionButton
              disabled={Boolean(busyAction) || !connectedPeer}
              label="Disconnect"
              onPress={handleDisconnect}
              variant="danger"
            />
          </View>
        </Card>

        {role === "host" ? (
          <Card>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Incoming connections</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Accept the request from the second device to open the message
                channel.
              </ThemedText>
            </View>

            {pendingInvitation ? (
              <ThemedView type="backgroundSelected" style={styles.listItem}>
                <View style={styles.peerInfo}>
                  <ThemedText type="smallBold">
                    {pendingInvitation.name}
                  </ThemedText>
                  <ThemedText type="code">
                    {pendingInvitation.peerId}
                  </ThemedText>
                </View>
                <View style={styles.inlineActions}>
                  <ActionButton
                    disabled={Boolean(busyAction)}
                    label="Accept"
                    onPress={handleAcceptInvitation}
                  />
                  <ActionButton
                    disabled={Boolean(busyAction)}
                    label="Reject"
                    onPress={handleRejectInvitation}
                    variant="secondary"
                  />
                </View>
              </ThemedView>
            ) : (
              <ThemedText themeColor="textSecondary">
                {isSessionActive
                  ? "No pending invitations yet. Start the Other Node screen on a second device to send one."
                  : "Start the main node first, then wait for a second device to request a connection."}
              </ThemedText>
            )}
          </Card>
        ) : (
          <Card>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Discovered main nodes</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Scan, pick the main node, and send a connection request.
              </ThemedText>
            </View>

            {discoveredPeers.length > 0 ? (
              <View style={styles.listColumn}>
                {discoveredPeers.map((peer) => (
                  <ThemedView
                    key={peer.peerId}
                    type="backgroundSelected"
                    style={styles.listItem}
                  >
                    <View style={styles.peerInfo}>
                      <ThemedText type="smallBold">{peer.name}</ThemedText>
                      <ThemedText type="code">{peer.peerId}</ThemedText>
                    </View>
                    <ActionButton
                      disabled={Boolean(busyAction) || Boolean(connectedPeer)}
                      label="Connect"
                      onPress={() => handleRequestConnection(peer)}
                    />
                  </ThemedView>
                ))}
              </View>
            ) : (
              <ThemedText themeColor="textSecondary">
                {isSessionActive
                  ? "No nearby main nodes found yet. Make sure the other phone has advertising enabled and both devices are on the same platform."
                  : "Start scanning to discover nearby main nodes."}
              </ThemedText>
            )}
          </Card>
        )}

        <Card>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Live chat</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Send a short custom message after the connection is established.
            </ThemedText>
          </View>

          <View style={styles.messageList}>
            {messages.slice(-10).map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.direction === "outgoing"
                    ? styles.outgoingBubble
                    : message.direction === "system"
                      ? styles.systemBubble
                      : styles.incomingBubble,
                ]}
              >
                <ThemedText type="smallBold">
                  {message.direction === "outgoing"
                    ? "You"
                    : message.direction === "system"
                      ? "System"
                      : message.peerId}
                </ThemedText>
                <ThemedText>{message.text}</ThemedText>
              </View>
            ))}
          </View>

          <TextInput
            value={draftMessage}
            onChangeText={setDraftMessage}
            placeholder="Type a custom message"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              styles.messageInput,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            autoCorrect={false}
            multiline
          />

          <ActionButton
            disabled={
              Boolean(busyAction) || !connectedPeer || !draftMessage.trim()
            }
            label="Send message"
            onPress={handleSendMessage}
          />
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Activity</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Quick event log for discovery, connection, and message flow.
            </ThemedText>
          </View>

          {activity.length > 0 ? (
            <View style={styles.listColumn}>
              {activity.map((entry, index) => (
                <ThemedText
                  key={`${entry}-${index}`}
                  type="small"
                  themeColor="textSecondary"
                >
                  {entry}
                </ThemedText>
              ))}
            </View>
          ) : (
            <ThemedText themeColor="textSecondary">No activity yet.</ThemedText>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  innerContainer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  heroRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  roleBadge: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  sectionHeader: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  statusBlock: {
    minWidth: 150,
    gap: Spacing.one,
    flex: 1,
  },
  statusBanner: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorBox: {
    backgroundColor: "#FFE1E1",
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: {
    color: "#8A1F1F",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
  listColumn: {
    gap: Spacing.two,
  },
  listItem: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  peerInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  inlineActions: {
    flexDirection: "row",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  messageList: {
    gap: Spacing.two,
  },
  messageBubble: {
    gap: Spacing.one,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  incomingBubble: {
    backgroundColor: "#DCEEFE",
  },
  outgoingBubble: {
    backgroundColor: "#DFF6E6",
  },
  systemBubble: {
    backgroundColor: "#F3E8C8",
  },
});
