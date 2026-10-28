import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { clearAccountStatusCache } from '../src/auth/account-status'
import { PayrollController } from '../src/payroll/payroll.controller'
import { payrollOptionsService } from '../src/payroll/payroll-options.service'

/**
 * /payroll/schemes and /payroll/options/:category against the test database
 * (migration 202610200002_payroll_schemes applied). Real users, roles and
 * profiles are created for the run and removed afterwards; the seeded rows are
 * restored to their state before the run.
 */
type JsonRecord = Record<string, any>

const stamp = Date.now().toString(36)
const people = {
  payroll: { email: `options-payroll-${stamp}@example.test`, role: 'Bookkeeping', id: '' },
  manager: { email: `options-manager-${stamp}@example.test`, role: 'Project Manager', id: '' },
  employee: { email: `options-employee-${stamp}@example.test`, role: 'Frontend Developer', id: '' },
}
type Person = typeof people.payroll

function tokenFor(person: Person) {
  return JwtService.generateAccessToken({ userId: person.id, email: person.email })
}

async function call(baseUrl: string, method: string, path: string, person: Person, body?: JsonRecord) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFor(person)}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function expectStatus(baseUrl: string, label: string, method: string, path: string, person: Person, expected: number, body?: JsonRecord) {
  const response = await call(baseUrl, method, path, person, body)
  assert.equal(response.status, expected, `${label}: expected ${expected}, got ${response.status} ${JSON.stringify(response.body)}`)
  return response.body
}

async function createPeople() {
  for (const person of Object.values(people)) {
    const user = await prisma.user.create({
      data: { email: person.email, name: person.email.split('@')[0], status: 'active', isApproved: true },
    })
    person.id = user.id
    await prisma.userRole.create({ data: { userId: user.id, role: person.role } })
  }
  // The employee is on the legacy weekdays scheme and the Part-Time option.
  await prisma.employeeProfile.create({
    data: { userId: people.employee.id, payrollScheme: 'weekdays', employmentType: 'Part-Time', paymentFrequency: 'Monthly' },
  })
}

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express()
  app.use(express.json())
  app.use('/payroll', new PayrollController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

const schemeByKey = (rows: JsonRecord[], key: string) => rows.find((row) => row.key === key)

async function runSchemeRoutes(baseUrl: string) {
  const { payroll, manager, employee } = people

  // Reads: any signed-in user; usage counts only for payroll roles.
  const employeeView = await expectStatus(baseUrl, 'employee lists schemes', 'GET', '/payroll/schemes', employee, 200)
  assert.ok(schemeByKey(employeeView, 'fixed_22_days')?.isDefault, 'seeded default')
  assert.equal(schemeByKey(employeeView, 'fixed_22_days')?.maxCreditedDays, 22)
  assert.ok(employeeView.every((row: JsonRecord) => !('inUseCount' in row)), 'no usage counts for employees')
  const payrollView = await expectStatus(baseUrl, 'payroll lists schemes', 'GET', '/payroll/schemes', payroll, 200)
  assert.ok(schemeByKey(payrollView, 'weekdays')?.inUseCount >= 1, 'weekdays is in use by the employee')

  // Writes: payroll roles only.
  const draft = { name: 'Flat 24 days', kind: 'fixed_days', value: 24 }
  await expectStatus(baseUrl, 'employee cannot add', 'POST', '/payroll/schemes', employee, 403, draft)
  await expectStatus(baseUrl, 'plain manager cannot add', 'POST', '/payroll/schemes', manager, 403, draft)
  const created = await expectStatus(baseUrl, 'payroll adds', 'POST', '/payroll/schemes', payroll, 201, draft)
  assert.equal(created.key, 'flat_24_days')
  assert.equal(created.isDefault, false)
  assert.equal(created.inUseCount, 0)
  await expectStatus(baseUrl, 'duplicate name', 'POST', '/payroll/schemes', payroll, 409, { ...draft, name: 'flat 24 DAYS' })
  await expectStatus(baseUrl, 'bad kind', 'POST', '/payroll/schemes', payroll, 400, { name: 'Odd', kind: 'monthly' })
  await expectStatus(baseUrl, 'fixed kind without value', 'POST', '/payroll/schemes', payroll, 400, { name: 'Odd days', kind: 'fixed_days' })
  await expectStatus(baseUrl, 'cap out of range', 'POST', '/payroll/schemes', payroll, 400, { name: 'Odd cap', kind: 'weekdays', maxCreditedDays: 40 })
  await expectStatus(baseUrl, 'short name', 'POST', '/payroll/schemes', payroll, 400, { name: 'X', kind: 'weekdays' })

  // Rename keeps the key; PATCH writes are payroll only.
  await expectStatus(baseUrl, 'employee cannot rename', 'PATCH', `/payroll/schemes/${created.id}`, employee, 403, { name: 'Nope' })
  const renamed = await expectStatus(baseUrl, 'rename', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 200, { name: 'Flat 24 working days' })
  assert.deepEqual([renamed.key, renamed.name], ['flat_24_days', 'Flat 24 working days'])
  await expectStatus(baseUrl, 'unknown id', 'PATCH', '/payroll/schemes/does-not-exist', payroll, 404, { name: 'Ghost scheme' })

  // Default switching: the old default is cleared in the same transaction.
  await expectStatus(baseUrl, 'unset default is refused', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 400, { isDefault: false })
  await expectStatus(baseUrl, 'set default', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 200, { isDefault: true })
  let rows = await expectStatus(baseUrl, 'list after default switch', 'GET', '/payroll/schemes', payroll, 200)
  assert.deepEqual(rows.filter((row: JsonRecord) => row.isDefault).map((row: JsonRecord) => row.key), ['flat_24_days'])
  assert.equal((await payrollOptionsService.newProfileDefaults()).payrollScheme, 'flat_24_days', 'new profiles get the new default')
  // A member without a profile gets one on the current default, not the column default.
  const managerProfile = await expectStatus(baseUrl, 'profile created on read', 'GET', `/payroll/config/${manager.id}`, payroll, 200)
  assert.equal(managerProfile.payrollScheme, 'flat_24_days')
  assert.equal(managerProfile.paymentFrequency, 'Monthly')
  // That profile now uses the new scheme, so it would block the delete below: move it off.
  await expectStatus(baseUrl, 'move the manager off the new scheme', 'POST', `/payroll/config/${manager.id}`, payroll, 200, { payrollScheme: 'fixed_22_days' })
  // An unknown stored key resolves to the default row.
  assert.equal((await payrollOptionsService.resolveScheme('no_such_scheme')).key, 'flat_24_days')
  await expectStatus(baseUrl, 'default cannot be archived', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 409, { archived: true })
  await expectStatus(baseUrl, 'default cannot be deleted', 'DELETE', `/payroll/schemes/${created.id}`, payroll, 409)
  const original = schemeByKey(rows, 'fixed_22_days')
  await expectStatus(baseUrl, 'default back', 'PATCH', `/payroll/schemes/${original.id}`, payroll, 200, { isDefault: true })

  // Archive and restore; an archived scheme cannot be newly chosen but keeps resolving.
  const archived = await expectStatus(baseUrl, 'archive', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 200, { archived: true })
  assert.equal(archived.archived, true)
  const refused = await expectStatus(baseUrl, 'archived scheme refused on a profile', 'POST', `/payroll/config/${employee.id}`, payroll, 400, { payrollScheme: 'flat_24_days' })
  assert.match(refused.error, /archived/)
  assert.equal((await payrollOptionsService.resolveScheme('flat_24_days')).key, 'flat_24_days', 'archived rows still resolve')
  await expectStatus(baseUrl, 'unknown scheme refused on a profile', 'POST', `/payroll/config/${employee.id}`, payroll, 400, { payrollScheme: 'flat_31' })
  const restored = await expectStatus(baseUrl, 'restore', 'PATCH', `/payroll/schemes/${created.id}`, payroll, 200, { archived: false })
  assert.equal(restored.archived, false)

  // Delete: only when unused; in use answers 409 and says to archive.
  await expectStatus(baseUrl, 'employee cannot delete', 'DELETE', `/payroll/schemes/${created.id}`, employee, 403)
  await expectStatus(baseUrl, 'delete unused', 'DELETE', `/payroll/schemes/${created.id}`, payroll, 200)
  rows = await expectStatus(baseUrl, 'list after delete', 'GET', '/payroll/schemes', payroll, 200)
  assert.equal(schemeByKey(rows, 'flat_24_days'), undefined)
  const weekdays = schemeByKey(rows, 'weekdays')
  const inUse = await expectStatus(baseUrl, 'delete in use', 'DELETE', `/payroll/schemes/${weekdays.id}`, payroll, 409)
  assert.match(inUse.error, /used by 1 employee/)
  assert.match(inUse.error, /Archive it instead/)

  // Archiving a scheme in use is allowed; the employee keeps it and can be saved with it.
  await expectStatus(baseUrl, 'archive in use', 'PATCH', `/payroll/schemes/${weekdays.id}`, payroll, 200, { archived: true })
  await expectStatus(baseUrl, 'profile keeps its archived scheme', 'POST', `/payroll/config/${employee.id}`, payroll, 200, { payrollScheme: 'weekdays', maxBillableHoursPerDay: 8 })
  assert.equal((await payrollOptionsService.resolveScheme('weekdays')).name, 'Weekdays of month')
  await expectStatus(baseUrl, 'restore weekdays', 'PATCH', `/payroll/schemes/${weekdays.id}`, payroll, 200, { archived: false })
  await expectStatus(baseUrl, 'valid scheme saved on a profile', 'POST', `/payroll/config/${employee.id}`, payroll, 200, { payrollScheme: 'fixed_22_days' })
  await expectStatus(baseUrl, 'and back', 'POST', `/payroll/config/${employee.id}`, payroll, 200, { payrollScheme: 'weekdays' })
}

async function runOptionRoutes(baseUrl: string) {
  const { payroll, manager, employee } = people
  const path = '/payroll/options/employment_type'

  const list = await expectStatus(baseUrl, 'employee lists employment types', 'GET', path, employee, 200)
  // Probationary and Temporary Hire are seeded since migration 202610280003_employment_categories.
  assert.deepEqual(list.map((row: JsonRecord) => row.value), ['Full-Time', 'Probationary', 'Temporary Hire', 'Part-Time', 'Contractor', 'Intern'])
  assert.equal(list.find((row: JsonRecord) => row.isDefault)?.value, 'Full-Time')
  const frequencies = await expectStatus(baseUrl, 'pay frequencies', 'GET', '/payroll/options/payment_frequency', payroll, 200)
  assert.equal(frequencies.find((row: JsonRecord) => row.isDefault)?.value, 'Monthly', 'Monthly stays the default')
  await expectStatus(baseUrl, 'unknown list', 'GET', '/payroll/options/currency', payroll, 404)

  await expectStatus(baseUrl, 'manager cannot add', 'POST', path, manager, 403, { label: 'Seasonal' })
  const created = await expectStatus(baseUrl, 'payroll adds', 'POST', path, payroll, 201, { label: 'Seasonal' })
  assert.deepEqual([created.value, created.label, created.isDefault], ['Seasonal', 'Seasonal', false])
  await expectStatus(baseUrl, 'duplicate label', 'POST', path, payroll, 409, { label: 'seasonal' })
  await expectStatus(baseUrl, 'seeded label is taken too', 'POST', path, payroll, 409, { label: 'probationary' })
  const relabelled = await expectStatus(baseUrl, 'relabel', 'PATCH', `${path}/${created.id}`, payroll, 200, { label: 'Seasonal (3 months)' })
  assert.equal(relabelled.value, 'Seasonal', 'the stored value never changes')
  await expectStatus(baseUrl, 'value is locked', 'PATCH', `${path}/${created.id}`, payroll, 400, { value: 'Trial' })
  await expectStatus(baseUrl, 'wrong list for the id', 'PATCH', `/payroll/options/payment_frequency/${created.id}`, payroll, 404, { label: 'Moved' })

  await expectStatus(baseUrl, 'set default', 'PATCH', `${path}/${created.id}`, payroll, 200, { isDefault: true })
  let rows = await expectStatus(baseUrl, 'list after default switch', 'GET', path, payroll, 200)
  assert.deepEqual(rows.filter((row: JsonRecord) => row.isDefault).map((row: JsonRecord) => row.value), ['Seasonal'])
  assert.equal((await payrollOptionsService.newProfileDefaults()).employmentType, 'Seasonal')
  const fullTime = rows.find((row: JsonRecord) => row.value === 'Full-Time')
  await expectStatus(baseUrl, 'default back', 'PATCH', `${path}/${fullTime.id}`, payroll, 200, { isDefault: true })

  // In use: Part-Time (the employee) answers 409 on delete; archiving is fine.
  const partTime = rows.find((row: JsonRecord) => row.value === 'Part-Time')
  assert.ok(partTime.inUseCount >= 1)
  const inUse = await expectStatus(baseUrl, 'delete in use', 'DELETE', `${path}/${partTime.id}`, payroll, 409)
  assert.match(inUse.error, /Archive it instead/)
  await expectStatus(baseUrl, 'archive in use', 'PATCH', `${path}/${partTime.id}`, payroll, 200, { archived: true })
  await expectStatus(baseUrl, 'archived option refused when newly chosen', 'POST', `/payroll/config/${manager.id}`, payroll, 400, { employmentType: 'Part-Time' })
  await expectStatus(baseUrl, 'unknown option refused', 'POST', `/payroll/config/${manager.id}`, payroll, 400, { paymentFrequency: 'Daily' })
  await expectStatus(baseUrl, 'restore', 'PATCH', `${path}/${partTime.id}`, payroll, 200, { archived: false })

  await expectStatus(baseUrl, 'delete unused', 'DELETE', `${path}/${created.id}`, payroll, 200)
  rows = await expectStatus(baseUrl, 'list after delete', 'GET', path, payroll, 200)
  assert.equal(rows.some((row: JsonRecord) => row.value === 'Seasonal'), false)
}

async function snapshotLists() {
  const [schemes, options] = await Promise.all([prisma.payrollScheme.findMany(), prisma.payrollOption.findMany()])
  return { schemes, options }
}

async function restoreLists(snapshot: Awaited<ReturnType<typeof snapshotLists>>) {
  await prisma.payrollScheme.deleteMany({ where: { id: { notIn: snapshot.schemes.map((row) => row.id) } } })
  await prisma.payrollOption.deleteMany({ where: { id: { notIn: snapshot.options.map((row) => row.id) } } })
  for (const { id, createdAt, updatedAt, ...data } of snapshot.schemes) await prisma.payrollScheme.update({ where: { id }, data })
  for (const { id, createdAt, updatedAt, ...data } of snapshot.options) await prisma.payrollOption.update({ where: { id }, data })
}

async function main() {
  const snapshot = await snapshotLists()
  assert.ok(snapshot.schemes.length >= 5, 'run the payroll schemes migration on the test database first')
  try {
    await createPeople()
    await withServer(async (baseUrl) => {
      await runSchemeRoutes(baseUrl)
      await runOptionRoutes(baseUrl)
    })
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(people).map((person) => person.email) } } })
    await restoreLists(snapshot)
    clearAccountStatusCache()
  }
  console.log('payroll.options.routes tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
