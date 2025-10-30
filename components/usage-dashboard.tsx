"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { FileText, Sparkles, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UsageDashboard() {
  const usage = useQuery(api.usage.getUserUsage);

  if (usage === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-border/20 rounded-2xl" />
        <div className="h-32 bg-border/20 rounded-2xl" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Sign in to view your usage
      </div>
    );
  }

  const documentPercentage = usage.quota.documents === -1 
    ? 0 
    : (usage.usage.documentsProcessed / usage.quota.documents) * 100;

  const aiPercentage = usage.quota.aiQueries === -1 
    ? 0 
    : (usage.usage.aiQueriesUsed / usage.quota.aiQueries) * 100;

  const isNearLimit = documentPercentage > 80 || aiPercentage > 80;
  const isAtLimit = !usage.canUpload || !usage.canUseAI;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Tier Badge */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium ${
            usage.tier === 'pro' 
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300' 
              : usage.tier === 'starter'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            {usage.tier.toUpperCase()}
          </div>
          {usage.status && usage.status !== 'active' && (
            <span className="text-xs text-muted-foreground">
              ({usage.status})
            </span>
          )}
        </div>
        {usage.tier === 'free' && (
          <Link href="/pricing">
            <Button variant="outline" size="sm" className="rounded-full">
              Upgrade
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Warning Banner */}
      {isNearLimit && !isAtLimit && (
        <motion.div
          className="flex items-start gap-3 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-yellow-500">
              Approaching Quota Limit
            </p>
            <p className="text-xs text-muted-foreground">
              You're using over 80% of your monthly quota. Consider upgrading to avoid interruption.
            </p>
          </div>
        </motion.div>
      )}

      {isAtLimit && (
        <motion.div
          className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-red-500">
              Quota Limit Reached
            </p>
            <p className="text-xs text-muted-foreground">
              You've reached your monthly quota. Upgrade your plan to continue.
            </p>
            <Link href="/pricing">
              <Button size="sm" className="mt-2 rounded-full">
                Upgrade Now
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Documents */}
        <motion.div
          className="p-6 rounded-2xl border border-border bg-background/50 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Documents</h3>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light">
                {usage.usage.documentsProcessed}
              </p>
              {usage.quota.documents !== -1 && (
                <p className="text-xs text-muted-foreground">
                  of {usage.quota.documents}
                </p>
              )}
            </div>
          </div>

          {usage.quota.documents !== -1 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(documentPercentage)}% used</span>
                <span>{usage.quota.documents - usage.usage.documentsProcessed} remaining</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    documentPercentage > 90 
                      ? 'bg-red-500' 
                      : documentPercentage > 70 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(documentPercentage, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {usage.quota.documents === -1 && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <TrendingUp className="w-3 h-3" />
              <span>Unlimited</span>
            </div>
          )}
        </motion.div>

        {/* AI Queries */}
        <motion.div
          className="p-6 rounded-2xl border border-border bg-background/50 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium">AI Explanations</h3>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light">
                {usage.usage.aiQueriesUsed}
              </p>
              {usage.quota.aiQueries !== -1 && (
                <p className="text-xs text-muted-foreground">
                  of {usage.quota.aiQueries}
                </p>
              )}
            </div>
          </div>

          {usage.quota.aiQueries !== -1 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(aiPercentage)}% used</span>
                <span>{usage.quota.aiQueries - usage.usage.aiQueriesUsed} remaining</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    aiPercentage > 90 
                      ? 'bg-red-500' 
                      : aiPercentage > 70 
                      ? 'bg-yellow-500' 
                      : 'bg-purple-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(aiPercentage, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {usage.quota.aiQueries === -1 && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <TrendingUp className="w-3 h-3" />
              <span>Unlimited</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Reset Date */}
      <motion.div
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Calendar className="w-3 h-3" />
        <span>
          Quota resets on {new Date(usage.usage.resetDate).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </span>
      </motion.div>
    </motion.div>
  );
}

