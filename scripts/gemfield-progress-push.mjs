#!/usr/bin/env node
// Gemfield progress sender.
//
// Reads a client build repo's STATUS.md (or an explicit --phase), maps it to a Gemfield build
// phase, and POSTs an HMAC-signed progress event to Deskii's webhook
// (POST /api/gemfield/progress). The signature MUST match the backend's canonical message
// (src/clients/gemfield/gemfield.webhook.ts): the payload fields joined by "\n" in a fixed order.
//
// Usage:
//   GEMFIELD_API_URL=https://deskii.example.com \
//   GEMFIELD_WEBHOOK_SECRET=... \
//   node scripts/gemfield-progress-push.mjs --gf-id GF-2026-0147 [--phase build] \
//     [--status-file ./STATUS.md] [--status complete] [--note "..."] \
//     [--staging-url https://staging...] [--live-url https://...] [--dry-run]
//
// Token provisioning: GEMFIELD_WEBHOOK_SECRET is issued by ops (see docs/gemfield-bridge/BLOCKERS.md).
// Until then, the staff editor in the control panel carries progress and this script is a no-op
// without the secret.

import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'

const FIELD_ORDER = ['gfId', 'phase', 'status', 'stagingUrl', 'liveUrl', 'note', 'at']

const GEMFIELD_PHASES = [
  'intake_received',
  'research',
  'blueprint',
  'design',
  'build',
  'qa',
  'client_review',
  'launch_prep',
  'live',
]

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    if (key === 'dry-run') {
      args.dryRun = true
      continue
    }
    args[key] = argv[i + 1]
    i += 1
  }
  return args
}

// Map a STATUS.md to a phase. Honors an explicit marker `<!-- gemfield:phase=build -->` first,
// then a `Phase: <name>` line (case-insensitive), matched against the known phase vocabulary.
function derivePhaseFromStatus(statusText) {
  const marker = statusText.match(/gemfield:phase\s*=\s*([a-z_]+)/i)
  if (marker && GEMFIELD_PHASES.includes(marker[1].toLowerCase())) return marker[1].toLowerCase()

  const phaseLine = statusText.match(/^\s*phase\s*[:=]\s*([a-z_ ]+)/im)
  if (phaseLine) {
    const normalized = phaseLine[1].trim().toLowerCase().replace(/\s+/g, '_')
    if (GEMFIELD_PHASES.includes(normalized)) return normalized
  }
  return null
}

function canonicalMessage(payload) {
  return FIELD_ORDER.map((field) => {
    const value = payload[field]
    return value === undefined || value === null ? '' : String(value)
  }).join('\n')
}

function sign(secret, payload) {
  const digest = crypto.createHmac('sha256', secret).update(canonicalMessage(payload), 'utf8').digest('hex')
  return `sha256=${digest}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiUrl = args.api || process.env.GEMFIELD_API_URL
  const secret = process.env.GEMFIELD_WEBHOOK_SECRET
  const gfId = args['gf-id'] || process.env.GEMFIELD_GF_ID

  if (!gfId || !/^GF-\d{4}-\d+$/.test(gfId)) {
    console.error('Missing or malformed --gf-id (expected GF-YYYY-NNNN).')
    process.exit(2)
  }

  let phase = args.phase
  if (!phase) {
    const statusFile = args['status-file'] || 'STATUS.md'
    try {
      const statusText = await readFile(statusFile, 'utf8')
      phase = derivePhaseFromStatus(statusText)
    } catch {
      console.error(`Could not read ${statusFile}; pass --phase explicitly.`)
      process.exit(2)
    }
  }
  if (!phase || !GEMFIELD_PHASES.includes(phase)) {
    console.error(`Could not resolve a valid phase (got: ${phase ?? 'none'}). Known: ${GEMFIELD_PHASES.join(', ')}`)
    process.exit(2)
  }

  const payload = {
    gfId,
    phase,
    status: args.status || 'complete',
    stagingUrl: args['staging-url'] || null,
    liveUrl: args['live-url'] || null,
    note: args.note || null,
    at: new Date().toISOString(),
  }

  if (args.dryRun) {
    console.log('[dry-run] payload:', JSON.stringify(payload, null, 2))
    console.log('[dry-run] canonical message:\n' + canonicalMessage(payload))
    if (secret) console.log('[dry-run] signature:', sign(secret, payload))
    return
  }

  if (!apiUrl) {
    console.error('Missing GEMFIELD_API_URL (or --api).')
    process.exit(2)
  }
  if (!secret) {
    console.error('Missing GEMFIELD_WEBHOOK_SECRET - ops has not provisioned the token yet (see BLOCKERS.md).')
    process.exit(2)
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/gemfield/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gemfield-Signature': sign(secret, payload),
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  if (!response.ok) {
    console.error(`Webhook failed (${response.status}): ${text}`)
    process.exit(1)
  }
  console.log(`Pushed ${gfId} -> ${phase}. Response: ${text}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
