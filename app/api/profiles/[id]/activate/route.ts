import { NextResponse } from "next/server";
import { ProfileRepository } from "@/lib/repositories/ProfileRepository";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/profiles/[id]/activate
 * Activate a profile (deactivates all others)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profileRepo = ProfileRepository.getInstance();
    profileRepo.setActive(id);

    const profile = profileRepo.getById(id);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to activate profile" },
      { status: 500 }
    );
  }
}

