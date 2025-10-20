"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export function BrowseGrid() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<Id<"articles"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"articles"> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"articles"> | null>(null);

  const updateArticle = useMutation(api.articles.updateArticle);
  const deleteArticle = useMutation(api.articles.deleteArticle);

  const browseData = useQuery(api.articles.getBrowseArticles, {
    search: searchQuery || undefined,
  });

  const allArticles = browseData
    ? [...browseData.curated, ...browseData.user]
    : [];

  useEffect(() => {
    if (!allArticles || allArticles.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")) {
        return;
      }

      if (confirmDeleteId) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleDelete(confirmDeleteId);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setConfirmDeleteId(null);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = (prev + 1) % allArticles.length;
          scrollToArticle(newIndex);
          return newIndex;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = (prev - 1 + allArticles.length) % allArticles.length;
          scrollToArticle(newIndex);
          return newIndex;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/read/${allArticles[selectedIndex]._id}`);
      } else if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, router, allArticles, confirmDeleteId]);

  const scrollToArticle = (index: number) => {
    const articleElement = document.querySelector(
      `[data-article-index="${index}"]`,
    );
    if (articleElement) {
      articleElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleEdit = (articleId: Id<"articles">, currentTitle: string) => {
    setEditingId(articleId);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    
    try {
      await updateArticle({
        id: editingId,
        title: editTitle.trim(),
      });
      setEditingId(null);
      setEditTitle("");
      toast.success("Article updated successfully");
    } catch (error) {
      console.error("Failed to update article:", error);
      toast.error("Failed to update article");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleDelete = async (articleId: Id<"articles">) => {
    setDeletingId(articleId);
    try {
      await deleteArticle({ id: articleId });
      toast.success("Article deleted successfully");
    } catch (error) {
      console.error("Failed to delete article:", error);
      toast.error("Failed to delete article");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (browseData === undefined) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-light text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (allArticles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-light text-muted-foreground mb-4">
          No articles yet
        </p>
        <Link
          href="/upload"
          className="text-sm font-light text-[#ff4500] hover:underline"
        >
          Upload your first article →
        </Link>
      </div>
    );
  }

  return (
    <>
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#0a0a0a] rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-light text-white mb-4">Delete Article?</h3>
            <p className="text-sm font-light text-gray-400 mb-8">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-6 py-2.5 text-sm font-light text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="px-6 py-2.5 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-8">
      <div className="mb-12">
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-md bg-background text-sm font-light focus:outline-none focus:ring-1 focus:ring-[#ff4500]"
        />
      </div>

      <div className="space-y-16">
        {browseData.curated.length > 0 && (
          <section>
            <h2 className="text-sm font-light tracking-widest text-muted-foreground mb-8">
              FOUNDER'S PICKS
            </h2>
            <div className="space-y-12">
              {browseData.curated.map((article, index) => {
                const globalIndex = index;
                return (
                  <Link
                    key={article._id}
                    href={`/read/${article._id}`}
                    className="block group relative pl-6"
                    data-article-index={globalIndex}
                  >
                    {selectedIndex === globalIndex && (
                      <span className="absolute left-0 top-0 text-[#ff4500] text-4xl font-light leading-none">
                        ›
                      </span>
                    )}
                    <div className="space-y-3">
                      <h3
                        className={`text-xl font-light leading-relaxed group-hover:text-muted-foreground ${selectedIndex === globalIndex ? "text-[#ff4500]" : ""}`}
                      >
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm font-light text-muted-foreground">
                        {article.metadata?.author && (
                          <>
                            <span>{article.metadata.author}</span>
                            <span>·</span>
                          </>
                        )}
                        {article.metadata?.estimatedReadingTime && (
                          <span>{article.metadata.estimatedReadingTime} min read</span>
                        )}
                        {!article.metadata?.estimatedReadingTime && (
                          <span>
                            {new Date(article.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {browseData.user.length > 0 && (
          <section>
            <h2 className="text-sm font-light tracking-widest text-muted-foreground mb-8">
              YOUR LIBRARY
            </h2>
            <div className="space-y-12">
              {browseData.user.map((article, index) => {
                const globalIndex = browseData.curated.length + index;
                const isEditing = editingId === article._id;
                const isDeleting = deletingId === article._id;
                
                return (
                  <div
                    key={article._id}
                    className="block group relative pl-6"
                    data-article-index={globalIndex}
                  >
                    {selectedIndex === globalIndex && (
                      <span className="absolute left-0 top-0 text-[#ff4500] text-4xl font-light leading-none">
                        ›
                      </span>
                    )}
                    <div className="space-y-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-2 py-1 border border-border rounded-md bg-background text-xl font-light focus:outline-none focus:ring-1 focus:ring-[#ff4500]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 hover:text-[#ff4500] transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 hover:text-[#ff4500] transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <Link
                            href={`/read/${article._id}`}
                            className="flex-1"
                          >
                            <h3
                              className={`text-xl font-light leading-relaxed group-hover:text-muted-foreground ${selectedIndex === globalIndex ? "text-[#ff4500]" : ""}`}
                            >
                              {article.title}
                            </h3>
                          </Link>
                          {!isDeleting && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEdit(article._id, article.title);
                                }}
                                className="p-1 hover:text-[#ff4500] transition-colors"
                                title="Edit title"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setConfirmDeleteId(article._id);
                                }}
                                className="p-1 hover:text-red-500 transition-colors"
                                title="Delete article"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {isDeleting && (
                            <div className="text-sm font-light text-muted-foreground">
                              Deleting...
                            </div>
                          )}
                        </div>
                      )}
                      {!isEditing && (
                        <div className="flex items-center gap-4 text-sm font-light text-muted-foreground">
                          {article.metadata?.author && (
                            <>
                              <span>{article.metadata.author}</span>
                              <span>·</span>
                            </>
                          )}
                          {article.metadata?.estimatedReadingTime && (
                            <span>{article.metadata.estimatedReadingTime} min read</span>
                          )}
                          {!article.metadata?.estimatedReadingTime && (
                            <span>
                              {new Date(article.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      </div>
    </>
  );
}
