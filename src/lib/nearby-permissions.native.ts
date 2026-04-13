import { Platform } from "react-native";
import {
    checkMultiple,
    PERMISSIONS,
    requestMultiple,
    RESULTS,
} from "react-native-permissions";

export type NearbyPermissionResult = {
  granted: boolean;
  message?: string;
};

const isAcceptedStatus = (value: string) => {
  return (
    value === RESULTS.GRANTED ||
    value === RESULTS.LIMITED ||
    value === RESULTS.UNAVAILABLE
  );
};

const getPermissions = () => {
  if (Platform.OS === "ios") {
    return [PERMISSIONS.IOS.BLUETOOTH];
  }

  return [
    PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
    PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
    PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
    PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
    PERMISSIONS.ANDROID.NEARBY_WIFI_DEVICES,
  ];
};

export async function ensureNearbyPermissions(): Promise<NearbyPermissionResult> {
  const permissions = getPermissions();
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
