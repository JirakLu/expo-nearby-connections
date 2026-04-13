import { Platform } from "react-native";

type PermissionsModule = typeof import("react-native-permissions");

export type NearbyPermissionResult = {
  granted: boolean;
  message?: string;
};

const permissionsModule =
  Platform.OS === "web"
    ? null
    : (require("react-native-permissions") as PermissionsModule);

const unsupportedResult: NearbyPermissionResult = {
  granted: false,
  message: "Nearby connections is only available on Android and iOS.",
};

export async function ensureNearbyPermissions(): Promise<NearbyPermissionResult> {
  if (!permissionsModule) {
    return unsupportedResult;
  }

  const { checkMultiple, PERMISSIONS, requestMultiple, RESULTS } =
    permissionsModule;

  const permissions =
    Platform.OS === "ios"
      ? [PERMISSIONS.IOS.BLUETOOTH]
      : [
          PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.NEARBY_WIFI_DEVICES,
        ];

  const isAcceptedStatus = (value: string) => {
    return (
      value === RESULTS.GRANTED ||
      value === RESULTS.LIMITED ||
      value === RESULTS.UNAVAILABLE
    );
  };

  const currentStatus = await checkMultiple(permissions);

  if (Object.values(currentStatus).every(isAcceptedStatus)) {
    return { granted: true };
  }

  const requestStatus = await requestMultiple(permissions);

  if (Object.values(requestStatus).every(isAcceptedStatus)) {
    return { granted: true };
  }

  return {
    granted: false,
    message:
      Platform.OS === "ios"
        ? "Bluetooth permission is required to discover and connect to nearby iOS devices."
        : "Bluetooth, location, and nearby device permissions are required to discover and connect to nearby Android devices.",
  };
}
