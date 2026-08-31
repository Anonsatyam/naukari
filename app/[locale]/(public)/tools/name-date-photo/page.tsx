import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import NameDatePhotoTool from "@/components/tools/NameDatePhotoTool";

export const metadata: Metadata = {
  title: "Name & Date on Photo",
  description: "Add your name and today's date onto a photo, positioned exactly where you want it.",
};

export default function NameDatePhotoPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Name & Date on Photo" },
        ]}
      />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        Name &amp; Date on Photo
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        Upload a photo, type your name and date, and drag the label to
        position it. Download the finished photo when you&apos;re happy with it.
      </p>

      <div className="mt-6">
        <NameDatePhotoTool />
      </div>
    </div>
  );
}
