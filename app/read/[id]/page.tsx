import { Navigation } from "@/components/navigation";
import { ReadingView } from "@/components/reading-view";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen">
      <Navigation />
      <ReadingView articleId={id} />
    </main>
  );
}
