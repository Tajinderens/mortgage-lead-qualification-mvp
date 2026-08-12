import { createBrokerDecisionAuditEvent, createUniqueId } from "@/lib/domain/audit";
import type { BrokerDecision, BrokerDecisionAction, FinalLeadPriorityStatus, LeadPriority } from "@/lib/domain/types";
import type { LeadStorage } from "@/lib/storage/lead-storage";

export interface RecordBrokerDecisionInput {
  leadId: string;
  action: BrokerDecisionAction;
  overridePriority?: LeadPriority;
  overrideReason?: string;
  decidedAt?: string;
}

export interface RecordBrokerDecisionResult {
  decision?: BrokerDecision;
  error?: string;
}

export async function recordBrokerDecision(storage: LeadStorage, input: RecordBrokerDecisionInput): Promise<RecordBrokerDecisionResult> {
  const lead = await storage.getLead(input.leadId);
  if (!lead) {
    return { error: "Lead not found." };
  }
  if (!lead.scoringResult) {
    return { error: "A system scoring result is required before broker review." };
  }

  const overrideReason = input.overrideReason?.trim();
  if (input.action === "recommendation_overridden" && !overrideReason) {
    return { error: "Override reason is required when changing the lead-priority status." };
  }
  if (input.action === "recommendation_overridden" && !input.overridePriority) {
    return { error: "Override lead-priority status is required." };
  }

  const finalLeadPriorityStatus = finalStatusForDecision(input.action, lead.scoringResult.priority, input.overridePriority);
  const decidedAt = input.decidedAt ?? new Date().toISOString();
  const decision: BrokerDecision = {
    id: createUniqueId("decision"),
    leadId: lead.id,
    originalRecommendation: lead.scoringResult.priority,
    brokerDecision: input.action,
    finalLeadPriorityStatus,
    overrideReason: overrideReason || undefined,
    decidedAt,
    scoringRuleVersion: lead.scoringResult.ruleVersion,
  };

  const brokerDecisionHistory = [...(lead.brokerDecisionHistory ?? []), decision];
  const updatedLead = {
    ...lead,
    updatedAt: decidedAt,
    currentBrokerDecision: decision,
    brokerDecisionHistory,
  };

  await storage.saveLead(updatedLead);
  await storage.saveAuditEvent(createBrokerDecisionAuditEvent(updatedLead, decision, decidedAt));

  return { decision };
}

function finalStatusForDecision(action: BrokerDecisionAction, originalRecommendation: LeadPriority, overridePriority?: LeadPriority): FinalLeadPriorityStatus {
  if (action === "recommendation_approved") {
    return originalRecommendation;
  }
  if (action === "recommendation_rejected") {
    return "Rejected";
  }
  if (!overridePriority) {
    throw new Error("Expected override priority after validation.");
  }
  return overridePriority;
}
