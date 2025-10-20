"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-background pt-12 pb-8 border-b border-border/40">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-12 min-w-0 flex-1">
            <SignedIn>
              <Link
                href="/dashboard"
                className={`text-sm font-light tracking-wide transition-colors ${
                  isActive("/dashboard")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                dashboard
              </Link>
              <Link
                href="/browse"
                className={`text-sm font-light tracking-wide transition-colors ${
                  isActive("/browse")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                browse
              </Link>
              <Link
                href="/upload"
                className={`text-sm font-light tracking-wide transition-colors ${
                  isActive("/upload")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                upload
              </Link>
            </SignedIn>
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0 text-center">
            <Link href="/" className="text-lg font-light tracking-wider">
              Serene
            </Link>
          </div>

          <div className="flex items-center gap-6 justify-end min-w-0 flex-1">
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm font-light tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                sign in
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="rounded-full px-5 text-xs font-medium tracking-wide uppercase"
                >
                  Join free
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton
                userProfileMode="navigation"
                userProfileUrl="/account"
                appearance={{
                  elements: {
                    rootBox: "flex-shrink-0",
                    avatarBox: "w-8 h-8 rounded-full border border-border",
                    userButtonPopoverCard:
                      "bg-card shadow-lg border border-border",
                    userButtonPopoverActionButton:
                      "text-sm font-light text-foreground hover:bg-accent",
                    userButtonPopoverActionButtonText: "font-light",
                    userButtonPopoverActionButtonIcon: "text-muted-foreground",
                    userButtonPopoverFooter: "hidden",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
