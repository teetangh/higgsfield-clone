import { prisma } from "@/lib/db/client";

export interface ProfileData {
  id: string;
  displayName: string;
  billingMode: string;
  manualBalanceUsd: number | null;
  budgetLimitUsd: number | null;
  budgetAlertPercent: number;
  updatedAt: string;
}

export interface UsageStats {
  imagesGenerated: number;
  spendTodayUsd: number;
  spendWeekUsd: number;
  totalEstimatedUsd: number;
  remainingBudgetUsd: number | null;
}

async function ensureProfile() {
  const existing = await prisma.profileSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.profileSettings.create({
    data: { id: "default" },
  });
}

export async function getProfile(): Promise<ProfileData> {
  const profile = await ensureProfile();
  return {
    id: profile.id,
    displayName: profile.displayName,
    billingMode: profile.billingMode,
    manualBalanceUsd: profile.manualBalanceUsd,
    budgetLimitUsd: profile.budgetLimitUsd,
    budgetAlertPercent: profile.budgetAlertPercent,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function updateProfile(
  data: Partial<{
    displayName: string;
    billingMode: string;
    manualBalanceUsd: number | null;
    budgetLimitUsd: number | null;
    budgetAlertPercent: number;
  }>
): Promise<ProfileData> {
  await ensureProfile();
  const profile = await prisma.profileSettings.update({
    where: { id: "default" },
    data,
  });
  return {
    id: profile.id,
    displayName: profile.displayName,
    billingMode: profile.billingMode,
    manualBalanceUsd: profile.manualBalanceUsd,
    budgetLimitUsd: profile.budgetLimitUsd,
    budgetAlertPercent: profile.budgetAlertPercent,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function getUsageStats(): Promise<UsageStats> {
  const profile = await ensureProfile();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const [imagesGenerated, spendToday, spendWeek, totalSpend] = await Promise.all([
    prisma.image.count({ where: { type: "output" } }),
    prisma.usageLog.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { estimatedUsd: true },
    }),
    prisma.usageLog.aggregate({
      where: { createdAt: { gte: startOfWeek } },
      _sum: { estimatedUsd: true },
    }),
    prisma.usageLog.aggregate({
      _sum: { estimatedUsd: true },
    }),
  ]);

  const totalEstimatedUsd = totalSpend._sum.estimatedUsd ?? 0;
  const remainingBudgetUsd =
    profile.budgetLimitUsd != null
      ? Math.max(0, profile.budgetLimitUsd - totalEstimatedUsd)
      : profile.manualBalanceUsd != null
        ? Math.max(0, profile.manualBalanceUsd - totalEstimatedUsd)
        : null;

  return {
    imagesGenerated,
    spendTodayUsd: spendToday._sum.estimatedUsd ?? 0,
    spendWeekUsd: spendWeek._sum.estimatedUsd ?? 0,
    totalEstimatedUsd,
    remainingBudgetUsd,
  };
}

export async function checkBudgetAllowed(estimatedUsd: number): Promise<{
  allowed: boolean;
  reason?: string;
  remainingBudgetUsd: number | null;
}> {
  const stats = await getUsageStats();
  const profile = await getProfile();

  if (profile.budgetLimitUsd != null) {
    if (estimatedUsd > stats.remainingBudgetUsd!) {
      return {
        allowed: false,
        reason: `Estimated cost ($${estimatedUsd.toFixed(2)}) exceeds remaining budget ($${stats.remainingBudgetUsd!.toFixed(2)}).`,
        remainingBudgetUsd: stats.remainingBudgetUsd,
      };
    }
  }

  return { allowed: true, remainingBudgetUsd: stats.remainingBudgetUsd };
}

export async function logUsage(
  generationId: string,
  model: string,
  imageCount: number,
  estimatedUsd: number
): Promise<void> {
  await prisma.usageLog.create({
    data: { generationId, model, imageCount, estimatedUsd },
  });
}
