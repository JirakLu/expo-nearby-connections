export type NearbyPermissionResult = {
  granted: boolean;
  message?: string;
};

export async function ensureNearbyPermissions(): Promise<NearbyPermissionResult> {
  return {
    granted: false,
    message: "Nearby connections is only available on Android and iOS.",
  };
}
