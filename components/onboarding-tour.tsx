"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname } from "next/navigation";

const ONBOARDING_STORAGE_KEY = "serene-onboarding-completed";

export function OnboardingTour() {
  const pathname = usePathname();
  const [hasShown, setHasShown] = useState(true);

  useEffect(() => {
    // Check if user has already completed onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (completed) {
      setHasShown(true);
      return;
    }

    // Only show on homepage for first-time users
    if (pathname !== "/") {
      return;
    }

    // Wait for page to load
    const timer = setTimeout(() => {
      startTour();
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          element: "body",
          popover: {
            title: "Welcome to Serene 🌿",
            description: "A calm reading platform that transforms PDFs into beautiful, annotatable experiences. Let's take a quick tour!",
            side: "center",
            align: "center",
          },
        },
        {
          element: 'a[href="/upload"]',
          popover: {
            title: "Upload Your Documents",
            description: "Start by uploading a PDF. We'll convert it into a clean, distraction-free reading experience with AI-powered extraction.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: 'a[href="/browse"]',
          popover: {
            title: "Browse Your Library",
            description: "Access all your uploaded articles. Use keyboard navigation (↑↓) to browse and Enter to open.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: 'a[href="/pricing"]',
          popover: {
            title: "Unlock Premium Features",
            description: "Get unlimited uploads, AI explanations, and advanced annotations with our Pro plan.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "body",
          popover: {
            title: "Reading Tips ✨",
            description: `
              <div class="space-y-3 text-sm">
                <p><strong>Select text</strong> to add notes or get AI explanations</p>
                <p><strong>Drag notes</strong> to organize your thoughts</p>
                <p><strong>Hover AI highlights</strong> for instant context</p>
                <p><strong>Press ?</strong> anytime to see all keyboard shortcuts</p>
              </div>
            `,
            side: "center",
            align: "center",
          },
        },
        {
          element: "body",
          popover: {
            title: "You're All Set! 🎉",
            description: "Ready to start reading? Upload your first document and experience the difference.",
            side: "center",
            align: "center",
          },
        },
      ],
      onDestroyStarted: () => {
        // Don't call destroy() here to avoid recursive loop
        // Just mark onboarding as completed when user closes or finishes
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
        setHasShown(true);
      },
    });

    driverObj.drive();
  };

  // Export function to manually restart tour
  if (typeof window !== "undefined") {
    (window as any).__restartOnboarding = () => {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setHasShown(false);
      startTour();
    };
  }

  return null;
}

