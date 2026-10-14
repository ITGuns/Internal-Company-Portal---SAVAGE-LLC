import assert from 'node:assert/strict'
import { EMAIL_SEND_TIMEOUT_MS, maskEmailAddress, settleEmailSends } from '../src/email/email.service'

/** Email sends are awaited (bounded) before responses, and logs mask recipients. No database. */

async function main() {
  assert.equal(maskEmailAddress('ana.cruz@example.com'), '***@example.com')
  assert.equal(maskEmailAddress(' books@mail.example.ph '), '***@mail.example.ph')
  assert.equal(maskEmailAddress('not-an-address'), '***')
  assert.equal(EMAIL_SEND_TIMEOUT_MS, 8_000)

  // Waits for every send.
  let delivered = 0
  const send = (ms: number) => new Promise<void>((resolve) => setTimeout(() => { delivered += 1; resolve() }, ms))
  await settleEmailSends('test sends', [send(5), send(15)])
  assert.equal(delivered, 2, 'both sends finished before settle returned')

  // A failed send is logged, never thrown.
  await settleEmailSends('failing send', [Promise.reject(new Error('SMTP down'))])

  // A hung mail server cannot stall the request past the timeout.
  const started = Date.now()
  await settleEmailSends('hung send', [new Promise(() => undefined)], 50)
  const waited = Date.now() - started
  assert.ok(waited >= 45 && waited < 1_000, `gave up after the timeout (waited ${waited} ms)`)

  await settleEmailSends('nothing to send', [])
  console.log('email.delivery tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
