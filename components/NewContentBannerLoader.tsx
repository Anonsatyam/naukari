"use client";

import dynamic from "next/dynamic";

const NewContentBanner = dynamic(() => import("@/components/NewContentBanner"), { ssr: false });

export default function NewContentBannerLoader() {
  return <NewContentBanner />;
}
