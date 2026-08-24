import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import PhotoResizerTool from "@/components/tools/PhotoResizerTool";

export const metadata: Metadata = {
  title: "Photo & Signature Resizer",
  description:
    "Crop and resize your photo or signature to an exact pixel size and file size for job application forms.",
};

export default function PhotoResizerPage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Photo & Signature Resizer" },
        ]}
      />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        Photo &amp; Signature Resizer
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        Upload a photo, choose a preset or set your own size, then drag the box
        to crop. We&apos;ll resize to the exact dimensions and compress to fit
        the target file size.
      </p>

      <div className="mt-6">
        <PhotoResizerTool />
      </div>
    </div>
  );
}
