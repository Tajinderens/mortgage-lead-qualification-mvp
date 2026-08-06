import type { AuditEvent, BrokerDecision, Lead, ScoringResult } from "@/lib/domain/types";

export function createLeadCreatedAuditEvent(lead: Lead, occurredAt: string = new Date().toISOString()): AuditEvent {
  return {
    id: createUniqueId("audit"),
    leadId: lead.id,
    type: "lead.created",
    occurredAt,
    actor: "demo-broker",
    summary: `Fictional lead created for ${lead.borrower.firstName} ${lead.borrower.lastName}.`,
    metadata: {
      demoDataOnly: true,
    },
  };
}

export function createScoreGeneratedAuditEvent(
  lead: Lead,
  scoringResult: ScoringResult,
  occurredAt: string = new Date().toISOString(),
): AuditEvent {
  return {
    id: createUniqueId("audit"),
    leadId: lead.id,
    type: "scoring.calculated",
    occurredAt,
    actor: "deterministic-scoring-engine",
    summary: `Lead-priority score calculated as ${scoringResult.priority}.`,
    metadata: {
      ruleVersion: scoringResult.ruleVersion,
      priority: scoringResult.priority,
      score: scoringResult.score,
      preliminaryBackendDtiPercent: scoringResult.metrics.preliminaryBackendDtiPercent,
      downPaymentPercent: scoringResult.metrics.downPaymentPercent,
      demoDataOnly: true,
    },
  };
}

export function createBrokerDecisionAuditEvent(lead: Lead, decision: BrokerDecision, occurredAt: string = new Date().toISOString()): AuditEvent {
  return {
    id: createUniqueId("audit"),
    leadId: lead.id,
    type: decision.brokerDecision,
    occurredAt,
    actor: "demo-broker",
    summary: brokerDecisionSummary(decision),
    metadata: {
      originalSystemScore: decision.originalSystemScore,
      originalRecommendation: decision.originalRecommendation,
      brokerDecision: decision.brokerDecision,
      finalLeadPriorityStatus: decision.finalLeadPriorityStatus,
      overrideReason: decision.overrideReason ?? null,
      decisionTimestamp: decision.decidedAt,
      scoringRuleVersion: decision.scoringRuleVersion,
      demoDataOnly: true,
    },
  };
}

function brokerDecisionSummary(decision: BrokerDecision): string {
  if (decision.brokerDecision === "recommendation_approved") {
    return `Broker approved the system recommendation of ${decision.originalRecommendation}.`;
  }
  if (decision.brokerDecision === "recommendation_rejected") {
    return `Broker rejected the system recommendation of ${decision.originalRecommendation}.`;
  }
  return `Broker overrode the lead-priority status from ${decision.originalRecommendation} to ${decision.finalLeadPriorityStatus}.`;
}

export function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
