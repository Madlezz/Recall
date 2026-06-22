/**
 * FSRS Optimizer — learns optimal parameters from review history.
 *
 * This implements a practical optimization approach:
 * 1. Computes actual retention rate from review logs
 * 2. Adjusts initial stability weights (w0-w3) based on first-review patterns
 * 3. Suggests optimal desiredRetention based on performance
 */

import { default_w } from "ts-fsrs";
import type { ReviewLog, Card } from "@/types";

export interface OptimizationResult {
  /** Optimized FSRS weights (21 parameters) */
  weights: number[];
  /** Suggested desiredRetention value (0.70-0.99) */
  suggestedRetention: number;
  /** Actual retention rate from history (0-1) */
  actualRetention: number;
  /** Number of reviews analyzed */
  reviewCount: number;
  /** Whether optimization was successful */
  success: boolean;
  /** Error message if optimization failed */
  error?: string;
}

/**
 * Analyze review history and optimize FSRS parameters.
 *
 * @param reviewLogs - All review logs from the database
 * @param cards - All cards (used to identify first reviews)
 * @param currentRetention - Current desiredRetention setting
 * @returns Optimization result with optimized weights and suggestions
 */
export function optimizeFromHistory(
  reviewLogs: ReviewLog[],
  cards: Card[],
  currentRetention: number
): OptimizationResult {
  // Need at least 50 reviews for meaningful optimization
  if (reviewLogs.length < 50) {
    return {
      weights: [...default_w],
      suggestedRetention: currentRetention,
      actualRetention: 0,
      reviewCount: reviewLogs.length,
      success: false,
      error: `Need at least 50 reviews for optimization (currently have ${reviewLogs.length})`,
    };
  }

  // Calculate actual retention rate
  const actualRetention = calculateRetention(reviewLogs);

  // Analyze first-review patterns to adjust initial stability
  const firstReviewAnalysis = analyzeFirstReviews(reviewLogs, cards);

  // Start with default weights
  const optimizedWeights = [...default_w];

  // Adjust w0-w3 (initial stability for Again, Hard, Good, Easy)
  if (firstReviewAnalysis.hasData) {
    // If users rate "Again" often on first review, reduce initial stability
    // If users rate "Good/Easy" often, increase initial stability
    const againRatio = firstReviewAnalysis.againCount / firstReviewAnalysis.totalCount;
    const goodEasyRatio = (firstReviewAnalysis.goodCount + firstReviewAnalysis.easyCount) / firstReviewAnalysis.totalCount;

    // Adjust w0 (Again initial stability)
    if (againRatio > 0.3) {
      optimizedWeights[0] = default_w[0] * 0.8; // Reduce if many "Again"
    } else if (againRatio < 0.1) {
      optimizedWeights[0] = default_w[0] * 1.2; // Increase if few "Again"
    }

    // Adjust w2 (Good initial stability)
    if (goodEasyRatio > 0.7) {
      optimizedWeights[2] = default_w[2] * 1.15; // Increase if many "Good/Easy"
    } else if (goodEasyRatio < 0.5) {
      optimizedWeights[2] = default_w[2] * 0.9; // Reduce if few "Good/Easy"
    }

    // Adjust w3 (Easy initial stability)
    if (firstReviewAnalysis.easyCount / firstReviewAnalysis.totalCount > 0.2) {
      optimizedWeights[3] = default_w[3] * 1.1;
    }
  }

  // Suggest optimal retention based on actual performance
  const suggestedRetention = calculateOptimalRetention(actualRetention, currentRetention);

  return {
    weights: optimizedWeights,
    suggestedRetention,
    actualRetention,
    reviewCount: reviewLogs.length,
    success: true,
  };
}

/**
 * Calculate actual retention rate from review logs.
 * Retention = proportion of reviews that were Good or Easy.
 */
function calculateRetention(reviewLogs: ReviewLog[]): number {
  if (reviewLogs.length === 0) return 0;

  const goodOrEasy = reviewLogs.filter(
    (log) => log.rating === "good" || log.rating === "easy"
  ).length;

  return goodOrEasy / reviewLogs.length;
}

/**
 * Analyze first-review patterns for new cards.
 */
function analyzeFirstReviews(
  reviewLogs: ReviewLog[],
  cards: Card[]
): {
  hasData: boolean;
  totalCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
} {
  // Group logs by cardId and find first review for each card
  const firstReviews = new Map<string, ReviewLog>();

  for (const log of reviewLogs) {
    const existing = firstReviews.get(log.cardId);
    if (!existing || new Date(log.reviewDate) < new Date(existing.reviewDate)) {
      firstReviews.set(log.cardId, log);
    }
  }

  // Only count first reviews for cards that are still "new" or recently created
  const cardIds = new Set(cards.map((c) => c.id));
  const validFirstReviews = Array.from(firstReviews.values()).filter((log) =>
    cardIds.has(log.cardId)
  );

  if (validFirstReviews.length < 10) {
    return {
      hasData: false,
      totalCount: 0,
      againCount: 0,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0,
    };
  }

  const counts = {
    totalCount: validFirstReviews.length,
    againCount: validFirstReviews.filter((l) => l.rating === "again").length,
    hardCount: validFirstReviews.filter((l) => l.rating === "hard").length,
    goodCount: validFirstReviews.filter((l) => l.rating === "good").length,
    easyCount: validFirstReviews.filter((l) => l.rating === "easy").length,
  };

  return { hasData: true, ...counts };
}

/**
 * Calculate optimal desiredRetention based on actual performance.
 *
 * - If actual retention is high (>0.9), user can afford lower retention target (longer intervals)
 * - If actual retention is low (<0.7), user needs higher retention target (shorter intervals)
 * - Clamp to reasonable range [0.75, 0.95]
 */
function calculateOptimalRetention(
  actualRetention: number,
  currentRetention: number
): number {
  // Target: if user remembers 90% of cards, suggest 0.85 retention (longer intervals)
  // If user remembers 70% of cards, suggest 0.90 retention (shorter intervals)
  let optimal: number;

  if (actualRetention >= 0.9) {
    // User is doing great, can afford longer intervals
    optimal = Math.max(0.80, currentRetention - 0.05);
  } else if (actualRetention >= 0.8) {
    // User is doing well, slight adjustment
    optimal = currentRetention;
  } else if (actualRetention >= 0.7) {
    // User is struggling slightly, suggest shorter intervals
    optimal = Math.min(0.92, currentRetention + 0.02);
  } else {
    // User is struggling, definitely need shorter intervals
    optimal = Math.min(0.95, currentRetention + 0.05);
  }

  // Clamp to valid range
  return Math.max(0.75, Math.min(0.95, optimal));
}

/**
 * Format optimization result for display.
 */
export function formatOptimizationResult(result: OptimizationResult): string {
  if (!result.success) {
    return result.error ?? "Optimization failed";
  }

  const retentionPercent = Math.round(result.actualRetention * 100);
  const suggestedPercent = Math.round(result.suggestedRetention * 100);

  return `Analyzed ${result.reviewCount} reviews. Your actual retention: ${retentionPercent}%. Suggested target: ${suggestedPercent}%.`;
}
