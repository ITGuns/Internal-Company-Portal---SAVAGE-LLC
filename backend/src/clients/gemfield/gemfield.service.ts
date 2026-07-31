import type { PrismaClient } from '@prisma/client'
import { prisma } from '../../database/prisma.service'
import { createClientActivity } from '../clients.activity'
import { isValidGfId, normalizeGfId, type GemfieldEntitledOrganization } from './gemfield.access'
import {
  GEMFIELD_PHASES,
  GEMFIELD_STAGING_VISIBLE_FROM,
  gemfieldPhaseLabel,
  isPhaseAtOrAfter,
} from './gemfield.phases'
import {
  GemfieldValidationError,
  planGemfieldProgress,
  validateGfId,
  type GemfieldProgressInput,
  type GemfieldProjectContext,
} from './gemfield.progress'

/** Payload accepted by the intake provisioning webhook. */
export interface GemfieldIntakeInput {
  gfId: string
  businessName: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  websiteUrl?: string | null
  tierLabel?: string | null
  at?: string | null
}

export interface GemfieldProvisionResult {
  organizationId: string
  projectId: string
  /** False when this gfId was already provisioned (replayed webhook). */
  created: boolean
  invited: boolean
  contactEmail?: string
  contactName?: string
}

// Shape returned to the client timeline. The full ordered phase list is always included so the UI
// can render the whole track; `milestones` marks which phases have been reached.
export interface SerializedGemfieldProject {
  id: string
  name: string
  gfId: string | null
  currentPhase: string | null
  currentPhaseLabel: string | null
  stagingUrl: string | null
  liveUrl: string | null
  progress: number
  status: string
  phases: Array<{ phase: string; label: string }>
  milestones: Array<{ phase: string; label: string; status: string; note: string | null; at: string | null }>
}

function serializeGemfieldProject(project: {
  id: string
  name: string
  gfId: string | null
  gemfieldPhase: string | null
  stagingUrl: string | null
  liveUrl: string | null
  previewUrl: string | null
  progress: number
  status: string
  gemfieldMilestones: Array<{ phase: string; status: string; note: string | null; at: Date }>
}): SerializedGemfieldProject {
  const currentPhase = project.gemfieldPhase ?? null
  // The staging link is only exposed once the build reaches client_review - enforced here on the
  // server, not merely hidden in the UI.
  const stagingVisible = currentPhase ? isPhaseAtOrAfter(currentPhase, GEMFIELD_STAGING_VISIBLE_FROM) : false

  return {
    id: project.id,
    name: project.name,
    gfId: project.gfId ?? null,
    currentPhase,
    currentPhaseLabel: currentPhase ? gemfieldPhaseLabel(currentPhase) : null,
    stagingUrl: stagingVisible ? project.stagingUrl ?? project.previewUrl ?? null : null,
    liveUrl: project.liveUrl ?? null,
    progress: project.progress,
    status: project.status,
    phases: GEMFIELD_PHASES.map((phase) => ({ phase, label: gemfieldPhaseLabel(phase) })),
    milestones: project.gemfieldMilestones.map((milestone) => ({
      phase: milestone.phase,
      label: gemfieldPhaseLabel(milestone.phase),
      status: milestone.status,
      note: milestone.note ?? null,
      at: milestone.at instanceof Date ? milestone.at.toISOString() : milestone.at ?? null,
    })),
  }
}

export interface GemfieldIngestResult {
  organizationId: string
  projectId: string
  phase: string
  currentPhase: string
}

export class GemfieldService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /** Minimal org record for the entitlement guard's `loadOrganization`. */
  async loadEntitledOrganization(organizationId: string): Promise<GemfieldEntitledOrganization | null> {
    return this.db.clientOrganization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true, gemfieldClient: true },
    })
  }

  /**
   * Staff-only: set an org's Gemfield entitlement. This is the ONLY write that may target a
   * not-yet-entitled org, so its route gates on management access rather than the entitlement guard.
   * GF-IDs are validated + de-duplicated against the GF-YYYY-NNNN format.
   */
  async setEntitlement(
    organizationId: string,
    input: { gemfieldClient?: boolean; gemfieldCaseIds?: string[] },
  ): Promise<{ id: string; gemfieldClient: boolean; gemfieldCaseIds: string[] }> {
    const existing = await this.db.clientOrganization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })
    if (!existing) throw new GemfieldValidationError('Client organization not found', 404)

    const data: { gemfieldClient?: boolean; gemfieldCaseIds?: string[] } = {}
    if (typeof input.gemfieldClient === 'boolean') {
      data.gemfieldClient = input.gemfieldClient
    }
    if (Array.isArray(input.gemfieldCaseIds)) {
      const normalized = input.gemfieldCaseIds
        .map((value) => normalizeGfId(String(value)))
        .filter((value) => value.length > 0)
      const invalid = normalized.find((id) => !isValidGfId(id))
      if (invalid) throw new GemfieldValidationError(`Not a valid GF-ID: ${invalid}`)
      data.gemfieldCaseIds = Array.from(new Set(normalized))
    }

    return this.db.clientOrganization.update({
      where: { id: organizationId },
      data,
      select: { id: true, gemfieldClient: true, gemfieldCaseIds: true },
    })
  }

  /** All of an org's projects with their build timelines (org scoping is enforced by the caller's guard). */
  async getProgressForOrganization(organizationId: string): Promise<SerializedGemfieldProject[]> {
    const projects = await this.db.clientProject.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        gfId: true,
        gemfieldPhase: true,
        stagingUrl: true,
        liveUrl: true,
        previewUrl: true,
        progress: true,
        status: true,
        gemfieldMilestones: {
          orderBy: { at: 'asc' },
          select: { phase: true, status: true, note: true, at: true },
        },
      },
    })
    return projects.map(serializeGemfieldProject)
  }

  /**
   * Intake provisioning: create the portal side for a freshly completed intake.
   *
   * Idempotent per gfId. A replayed webhook returns the existing ids and
   * invites nobody a second time, matching the progress webhook's contract.
   * Everything except the invite happens in one transaction, so a partial
   * failure cannot leave an organization without its project.
   */
  async provisionIntake(input: GemfieldIntakeInput): Promise<GemfieldProvisionResult> {
    const gfId = validateGfId(input.gfId ?? '')
    const contactEmail = (input.contactEmail ?? '').trim().toLowerCase()
    if (!/.+@.+\..+/.test(contactEmail)) {
      throw new GemfieldValidationError('invalid_contact_email', 400)
    }
    const businessName = (input.businessName ?? '').trim() || 'Unnamed business'
    const contactName = (input.contactName ?? '').trim() || contactEmail

    // Already provisioned? Return what exists; never invite twice.
    const existing = await this.db.clientProject.findFirst({
      where: { gfId },
      select: { id: true, organizationId: true },
    })
    if (existing) {
      return {
        organizationId: existing.organizationId,
        projectId: existing.id,
        created: false,
        invited: false,
      }
    }

    // Best-effort tier match by label; an unmatched label leaves tier unset
    // rather than failing provisioning over a cosmetic field.
    const tier = input.tierLabel
      ? await this.db.clientServiceTier.findFirst({
          where: { name: { equals: input.tierLabel.trim(), mode: 'insensitive' } },
          select: { id: true },
        })
      : null

    const slug = await this.uniqueOrganizationSlug(businessName)

    const provisioned = await this.db.$transaction(async (tx) => {
      const organization = await tx.clientOrganization.create({
        data: {
          name: businessName,
          slug,
          status: 'active',
          websiteUrl: input.websiteUrl?.trim() || null,
          gemfieldClient: true,
          gemfieldCaseIds: [gfId],
          tierId: tier?.id ?? null,
        },
        select: { id: true },
      })

      const project = await tx.clientProject.create({
        data: {
          organizationId: organization.id,
          name: `${businessName} website`,
          status: 'planning',
          gfId,
          gemfieldPhase: GEMFIELD_PHASES[0],
          startedAt: new Date(),
        },
        select: { id: true },
      })

      await tx.gemfieldMilestone.create({
        data: {
          projectId: project.id,
          phase: GEMFIELD_PHASES[0],
          status: 'complete',
          note: 'Intake completed by the client.',
          at: input.at ? new Date(input.at) : new Date(),
        },
      })

      return { organizationId: organization.id, projectId: project.id }
    })

    return {
      organizationId: provisioned.organizationId,
      projectId: provisioned.projectId,
      created: true,
      invited: false,
      contactEmail,
      contactName,
    }
  }

  /** Slugify the business name, suffixing until it is free. */
  private async uniqueOrganizationSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'client'
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
      const clash = await this.db.clientOrganization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
      if (!clash) return candidate
    }
    return `${base}-${Date.now()}`
  }

  /** Webhook path: resolve the project by GF-ID (org must be entitled), then apply. */
  async ingestProgress(input: GemfieldProgressInput): Promise<GemfieldIngestResult> {
    const gfId = validateGfId(input.gfId ?? '')
    const project = await this.db.clientProject.findFirst({
      where: { gfId, organization: { gemfieldClient: true } },
      select: {
        id: true,
        organizationId: true,
        gemfieldMilestones: { select: { phase: true } },
      },
    })
    if (!project) throw new GemfieldValidationError('unknown_gfId', 404)
    return this.applyProgress(
      {
        id: project.id,
        organizationId: project.organizationId,
        existingPhases: project.gemfieldMilestones.map((milestone) => milestone.phase),
      },
      { ...input, gfId },
    )
  }

  /** Staff manual editor: project id is known; scoped to the guarded org to block cross-org targeting. */
  async setProjectPhase(
    organizationId: string,
    projectId: string,
    input: Omit<GemfieldProgressInput, 'gfId'>,
  ): Promise<GemfieldIngestResult> {
    const project = await this.db.clientProject.findFirst({
      where: { id: projectId, organizationId },
      select: {
        id: true,
        organizationId: true,
        gemfieldMilestones: { select: { phase: true } },
      },
    })
    if (!project) throw new GemfieldValidationError('unknown_project', 404)
    return this.applyProgress(
      {
        id: project.id,
        organizationId: project.organizationId,
        existingPhases: project.gemfieldMilestones.map((milestone) => milestone.phase),
      },
      input,
    )
  }

  private async applyProgress(
    project: GemfieldProjectContext,
    input: GemfieldProgressInput,
  ): Promise<GemfieldIngestResult> {
    const plan = planGemfieldProgress(project, input)

    await this.db.$transaction(async (tx) => {
      // Idempotent per (projectId, phase): a replayed webhook upserts the same row in place.
      await tx.gemfieldMilestone.upsert({
        where: { projectId_phase: plan.milestoneWhere },
        create: {
          projectId: plan.milestoneWhere.projectId,
          phase: plan.milestoneWhere.phase,
          status: plan.milestoneStatus,
          note: plan.milestoneNote,
          at: plan.milestoneAt,
        },
        update: {
          status: plan.milestoneStatus,
          note: plan.milestoneNote,
          at: plan.milestoneAt,
        },
      })
      await tx.clientProject.update({ where: { id: project.id }, data: plan.projectUpdates })
      await createClientActivity(tx, plan.activity)
    })

    return {
      organizationId: project.organizationId,
      projectId: project.id,
      phase: input.phase,
      currentPhase: plan.currentPhase,
    }
  }
}
