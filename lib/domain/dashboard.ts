import type { Lead, LeadPriority } from "@/lib/domain/types";

export const dashboardPriorityOrder: LeadPriority[] = ["Hot", "Warm", "Cold", "Not Ready", "Manual Review"];

export interface DashboardSummary {
  totalLeadCount: number;
  countsByPriority: Record<LeadPriority, number>;
  pendingBrokerReviewCount: number;
  recentLeads: Lead[];
}

export function createDashboardSummary(leads: Lead[], recentLeadLimit = 5): DashboardSummary {
  const countsByPriority = dashboardPriorityOrder.reduce<Record<LeadPriority, number>>((counts, priority) => {
    counts[priority] = 0;
    return counts;
  }, {} as Record<LeadPriority, number>);

  leads.forEach((lead) => {
    const priority = lead.scoringResult?.priority;
    if (priority) {
      countsByPriority[priority] += 1;
    }
  });

  return {
    totalLeadCount: leads.length,
    countsByPriority,
    pendingBrokerReviewCount: leads.filter((lead) => lead.scoringResult && !lead.currentBrokerDecision).length,
    recentLeads: [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, recentLeadLimit),
  };
}
