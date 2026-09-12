"use client";

import dynamic from "next/dynamic";

const PwaInstallPrompt = dynamic(() => import("@/components/PwaInstallPrompt"), { ssr: false });
const SubscribeModal = dynamic(() => import("@/components/SubscribeModal"), { ssr: false });

export default function DeferredWidgets() {
  return (
    <>
      <PwaInstallPrompt />
      <SubscribeModal />
    </>
  );
}
