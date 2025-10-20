"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useState } from "react"

export default function DebugArticlePage() {
  const [articleId, setArticleId] = useState("jd7e1617m9tctxvg2p4y94sfth7smjxb")
  const debugData = useQuery(
    api.articles.debugArticle,
    articleId ? { id: articleId as Id<"articles"> } : "skip"
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Article</h1>
      <input
        type="text"
        value={articleId}
        onChange={(e) => setArticleId(e.target.value)}
        className="border p-2 mb-4 w-full"
        placeholder="Enter article ID"
      />
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(debugData, null, 2)}
      </pre>
    </div>
  )
}
