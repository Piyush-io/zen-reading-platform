import { Navigation } from "@/components/navigation"
import { BrowseGrid } from "@/components/browse-grid"

export default function BrowsePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-32 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-24 text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">Browse</h1>
            <p className="text-sm font-light text-muted-foreground">Curated articles and essays</p>
          </div>
          <BrowseGrid />
        </div>
      </div>
    </main>
  )
}
