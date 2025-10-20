import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchMutation, fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
export const maxDuration = 300;

// Constants
const ALLOWED_HOSTS = ["uploadthing.com", "utfs.io", "ufs.sh"];
/**
 * NOTE: Heavy lifting (OCR, refinement, storage writes) now happens inside
 * Convex background workers. This route performs validation, ensures the user
 * exists in Convex, creates the initial processing article, and enqueues the
 * background job.
 */

// Types
// Validation helpers
const isAllowedUploadUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some((host) => hostname.endsWith(host));
  } catch {
    return false;
  }
};

const validateRequest = (
  body: any,
): { fileUrl: string; fileName: string; title?: string } => {
  const { fileUrl, fileName, title } = body;

  if (!fileUrl || !fileName) {
    throw new Error("Missing fileUrl or fileName");
  }

  if (typeof fileUrl !== "string" || typeof fileName !== "string") {
    throw new Error("Invalid fileUrl or fileName type");
  }

  if (!isAllowedUploadUrl(fileUrl)) {
    throw new Error(`Invalid file URL host: ${fileUrl}`);
  }

  return { fileUrl, fileName, title };
};

const ensureUser = async (clerkId: string, user: any): Promise<void> => {
  await fetchMutation(api.users.getOrCreateUser, {
    clerkId,
    email: user.emailAddresses[0]?.emailAddress || "",
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    imageUrl: user.imageUrl || undefined,
  });
};

// Main handler
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl, fileName, title } = validateRequest(body);

    // Ensure user exists in Convex
    await ensureUser(userId, user);

    // Create a processing article immediately
    const createdId = await fetchMutation(
      api.articles.createProcessingArticleWithClerkId as any,
      {
        clerkId: userId,
        title: title || fileName.replace(/\.pdf$/i, ""),
        source: "upload",
        sourceUrl: fileUrl,
        uploadFileId: fileUrl,
      } as any,
    );

    // Enqueue background processing in Convex worker
    await fetchAction(api.background.queuePdfProcessing as any, {
      clerkId: userId,
      articleId: createdId,
      fileUrl,
      fileName,
      title,
    } as any);

    return NextResponse.json({ success: true, articleId: createdId, queued: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process PDF";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 : 500;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
