import { Navigation } from "@/components/navigation"

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-32 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-24 text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-8">About Serene</h1>
            <p className="text-base font-light text-muted-foreground leading-relaxed">
              A minimalist platform for focused reading
            </p>
          </div>

          <div className="space-y-12 text-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-light">Our Mission</h2>
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                In a world cluttered with ads and distractions, we believe reading should be peaceful and immersive.
                Serene brings back the joy of focused reading.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-light">The Platform</h2>
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                We combine AI technology with minimalist design to create a space where content shines. Whether you're
                reading technical documentation or essays, Serene is built for you.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-light">Our Commitment</h2>
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                Ad-free, fast, and accessible to everyone. No paywalls, no premium tiers—just great content and a great
                reading experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
