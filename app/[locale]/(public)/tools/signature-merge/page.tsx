import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import SignatureMergeTool from "@/components/tools/SignatureMergeTool";

export const metadata: Metadata = {
  title: "Merge Signature on Photo",
  description: "Overlay your signature onto a photo, with optional white-background removal.",
};

export default function SignatureMergePage() {
  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Merge Signature on Photo" },
        ]}
      />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        Merge Signature on Photo
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        Upload a photo and your signature, then drag and resize the signature
        onto the photo. Turn on background removal if your signature was
        scanned on white paper.
      </p>

      <div className="mt-6">
        <SignatureMergeTool />
      </div>
    </div>
  );
}
