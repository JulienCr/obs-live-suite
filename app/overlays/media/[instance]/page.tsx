import { MediaOverlayRenderer } from "@/components/overlays/MediaOverlayRenderer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Overlay",
};

interface PageProps {
  params: Promise<{
    instance: string;
  }>;
}

export default async function MediaOverlayPage({ params }: PageProps) {
  const { instance } = await params;

  if (instance !== "A" && instance !== "B") {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        <div className="text-2xl">Invalid instance: {instance}</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <MediaOverlayRenderer instance={instance as "A" | "B"} />
    </div>
  );
}
