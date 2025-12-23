import { NextResponse } from "next/server";

/**
 * GET /api/utils/metadata
 * Fetch metadata from a URL
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json(
            { error: "URL is required" },
            { status: 400 }
        );
    }

    try {
        // Handle YouTube URLs
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            let fetchUrl = url;

            // Convert embed URL to watch URL for oEmbed
            if (url.includes("/embed/")) {
                const videoId = url.split("/embed/")[1]?.split("?")[0];
                if (videoId) {
                    fetchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                }
            }

            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(fetchUrl)}&format=json`;
            const res = await fetch(oembedUrl);

            if (!res.ok) {
                throw new Error("Failed to fetch YouTube metadata");
            }

            const data = await res.json();

            return NextResponse.json({
                title: data.title,
                author_name: data.author_name,
                provider: "youtube",
            });
        }

        // Fallback for other URLs (could be expanded)
        return NextResponse.json(
            { error: "Unsupported provider" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Metadata fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch metadata" },
            { status: 500 }
        );
    }
}
