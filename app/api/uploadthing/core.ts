import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@clerk/nextjs/server"
 
const f = createUploadthing()
 
export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth()

      if (!userId) throw new Error("Unauthorized")

      return { userId }
    })
    .onUploadComplete(() => {
      // Client handles PDF processing
    }),
} satisfies FileRouter
 
export type OurFileRouter = typeof ourFileRouter
