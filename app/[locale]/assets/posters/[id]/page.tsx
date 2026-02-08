import { notFound } from "next/navigation";
import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { SubVideoService } from "@/lib/services/SubVideoService";
import { AssetDetailView } from "@/components/assets/AssetDetailView";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function PosterDetailPage({ params }: Props) {
  const { id, locale } = await params;

  const posterRepo = PosterRepository.getInstance();
  const poster = posterRepo.getById(id);

  if (!poster) {
    notFound();
  }

  const subVideoService = SubVideoService.getInstance();
  const subVideos = subVideoService.getSubVideos(id);
  const parentPoster = poster.parentPosterId
    ? posterRepo.getById(poster.parentPosterId)
    : null;

  // Fetch chapters from metadata
  const chapters = (poster.metadata?.chapters as Array<{id: string; title: string; timestamp: number}>) || [];

  return (
    <AssetDetailView
      poster={poster}
      subVideos={subVideos}
      parentPoster={parentPoster}
      chapters={chapters}
      locale={locale}
    />
  );
}
