import assert from 'node:assert/strict'
import {
  isGemfieldTicketKind,
  normalizeWizardTicket,
  resolveTicketPriority,
} from '../src/clients/gemfield/gemfield-ticket'
import { GemfieldTicketService, ticketReference } from '../src/clients/gemfield/gemfield-ticket.service'

function testPriorityRouting(): void {
  assert.equal(resolveTicketPriority('dev_assist', 'website_change'), 'high', 'dev_assist is always high')
  assert.equal(resolveTicketPriority('callback', 'support'), 'high', 'callback is always high')
  assert.equal(resolveTicketPriority('standard', 'broken'), 'high', 'a broken site is high')
  assert.equal(resolveTicketPriority('standard', 'website_change'), 'normal', 'a normal change is normal')
  assert.equal(resolveTicketPriority('standard', 'billing'), 'normal', 'billing is normal')
}

function testKindGuard(): void {
  assert.equal(isGemfieldTicketKind('dev_assist'), true)
  assert.equal(isGemfieldTicketKind('escalate'), false)
  assert.equal(isGemfieldTicketKind(null), false)
}

function testNormalization(): void {
  // Unknown category/kind coerce to safe defaults; title defaults per category.
  const fallback = normalizeWizardTicket({ category: 'nonsense', ticketKind: 'nope' })
  assert.equal(fallback.category, 'other', 'unknown category -> other')
  assert.equal(fallback.ticketKind, 'standard', 'unknown kind -> standard')
  assert.equal(fallback.title, 'New request', 'default title for other')
  assert.equal(fallback.priority, 'normal')

  const broken = normalizeWizardTicket({ category: 'broken' })
  assert.equal(broken.title, 'Something is broken on my site', 'default title for broken')
  assert.equal(broken.priority, 'high', 'broken routes to high even as standard kind')

  // Callback folds the phone number + window into the description AND keeps the kind/priority.
  const callback = normalizeWizardTicket({
    category: 'support',
    ticketKind: 'callback',
    description: 'Please call me',
    callbackNumber: '555-0100',
    callbackWindow: 'weekday mornings',
  })
  assert.equal(callback.priority, 'high')
  assert.ok(callback.description?.includes('555-0100'), 'callback number is captured in the description')
  assert.ok(callback.description?.includes('weekday mornings'), 'preferred window is captured')
  assert.ok(callback.description?.includes('Please call me'), 'the typed note is preserved')

  // wizardVersion + answers pass through; projectId empty -> null.
  const full = normalizeWizardTicket({
    category: 'website_change',
    title: '  Update hours  ',
    wizardVersion: 'v2',
    wizardAnswers: { page: 'contact', changeType: 'hours' },
    projectId: '',
  })
  assert.equal(full.title, 'Update hours', 'title is trimmed')
  assert.equal(full.sourceWizardVersion, 'v2')
  assert.deepEqual(full.wizardAnswers, { page: 'contact', changeType: 'hours' })
  assert.equal(full.projectId, null, 'empty projectId -> null')
}

function testReference(): void {
  assert.equal(ticketReference('ckabc123def456'), 'TK-DEF456', 'reference is the last 6 chars, upper-cased')
}

async function testAttachmentTotalCap(): Promise<void> {
  // The 1 MB JSON parser on /api/gemfield leaves about 700 KB of files per ticket.
  const stored: string[] = []
  const uploads = {
    create: async (_userId: string, name: string) => {
      stored.push(name)
      return { id: name }
    },
  }
  const service = new GemfieldTicketService(uploads as never, {} as never)
  const pdfOfSize = (bytes: number) =>
    `data:application/pdf;base64,${Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(bytes - 9)]).toString('base64')}`
  await assert.rejects(
    service.createWizardTicket('org-1', 'user-1', { category: 'support' }, [
      { name: 'a.pdf', contentType: 'application/pdf', data: pdfOfSize(400 * 1024) },
      { name: 'b.pdf', contentType: 'application/pdf', data: pdfOfSize(400 * 1024) },
    ]),
    /Attachments can be up to 700 KB in total/,
  )
  await assert.rejects(
    service.createWizardTicket('org-1', 'user-1', { category: 'support' }, [
      { name: 'ok.pdf', contentType: 'application/pdf', data: pdfOfSize(1024) },
      { name: 'fake.png', contentType: 'image/png', data: pdfOfSize(1024) },
    ]),
    /That file type is not supported/,
  )
  assert.deepEqual(stored, [], 'nothing is stored when any attachment is refused')
}

testPriorityRouting()
testKindGuard()
testNormalization()
testReference()
testAttachmentTotalCap()
  .then(() => console.log('gemfield-ticket tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
