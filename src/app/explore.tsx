import { NearbyDemo } from "@/components/nearby-demo";
import React from "react";

export default function TabTwoScreen() {
  return (
    <NearbyDemo
      role="client"
      title="Other Node"
      subtitle="Discover the main node from a second device, request a connection, and send custom text messages once the link is accepted."
    />
  );
}
