import React from "react";

import { NearbyDemo } from "@/components/nearby-demo";

export default function HomeScreen() {
  return (
    <NearbyDemo
      role="host"
      title="Main Node"
      subtitle="Advertise this device, accept the incoming request from the second device, and exchange simple custom messages once connected."
    />
  );
}
