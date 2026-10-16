import assert from 'node:assert/strict'
import express from 'express'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { AddressInfo } from 'net'
import { prisma } from '../src/database/prisma.service'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.JWT_SECRET ||= 'test-chat-attachment-jwt-secret'
process.env.REFRESH_TOKEN_SECRET ||= 'test-chat-attachment-refresh-secret'

const { JwtService } = require('../src/auth/jwt.service') as typeof import('../src/auth/jwt.service')
const { ChatController } = require('../src/chat/chat.controller') as typeof import('../src/chat/chat.controller')
const { UploadsController } = require('../src/uploads/uploads.controller') as typeof import('../src/uploads/uploads.controller')
const { configureJsonBodyParsers } = require('../src/security/json-body-limits') as typeof import('../src/security/json-body-limits')

const uploadDir = path.join(__dirname, '../uploads')
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)])
const pdf = Buffer.from('%PDF-1.7\nchat attachment test\n', 'ascii')
const legacyInline = `data:image/png;base64,${png.toString('base64')}`

interface UploadBody { id: string; filename: string; name: string; type: string; size: number }
interface MessageBody { id: string; attachment: string | null }

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function runChatAttachmentTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const makeUser = (label: string) => prisma.user.create({
    data: { email: `chat-attach-${label}-${suffix}@example.com`, name: `Chat ${label}`, status: 'active', isApproved: true },
  })
  const [sender, recipient, outsider, otherOwner] = await Promise.all([
    makeUser('sender'), makeUser('recipient'), makeUser('outsider'), makeUser('other-owner'),
  ])
  const userIds = [sender.id, recipient.id, outsider.id, otherOwner.id]
  const conversation = await prisma.conversation.create({
    data: { type: 'direct', participants: { create: [{ userId: sender.id }, { userId: recipient.id }] } },
  })

  const app = express()
  configureJsonBodyParsers(app)
  app.use('/api/chat', new ChatController().router())
  app.use('/api/uploads', new UploadsController().router())
  const server = app.listen(0)
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
  const uploadedFilenames: string[] = []
  let folderId = ''

  const tokenFor = (user: { id: string; email: string }) => JwtService.generateAccessToken({ userId: user.id, email: user.email, name: 'Chat Attachment Test' })
  const senderToken = tokenFor(sender)
  const call = (token: string, route: string, init: { method?: string; body?: unknown } = {}) => fetch(`${baseUrl}${route}`, {
    method: init.method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const upload = async (token: string, name: string, type: string, data: Buffer) => {
    const response = await call(token, '/uploads', { method: 'POST', body: { name, type, data: data.toString('base64') } })
    assert.equal(response.status, 201)
    const body = await response.json() as UploadBody
    uploadedFilenames.push(body.filename)
    return body
  }
  const send = (attachment: unknown, content = '') => call(senderToken, `/chat/${conversation.id}/messages`, {
    method: 'POST',
    body: { content, attachment },
  })
  const messagesPath = `/chat/${conversation.id}/messages`
  const filePath = (uploadId: string) => `/uploads/files/${uploadId}`

  try {
    const image = await upload(senderToken, 'Team Photo.png', 'image/png', png)
    const metadata = { name: image.name, type: image.type, size: image.size, uploadId: image.id }

    // A valid uploadId is accepted and only the metadata is stored.
    const sent = await send(metadata, 'see attached')
    assert.equal(sent.status, 201)
    const sentBody = await sent.json() as MessageBody
    assert.deepEqual(JSON.parse(sentBody.attachment || ''), metadata)
    const row = await prisma.message.findUniqueOrThrow({ where: { id: sentBody.id } })
    assert.equal(row.attachment, JSON.stringify(metadata))
    assert.ok(!row.attachment?.includes('base64'), 'no file data in the message row')

    // Someone else's upload is refused.
    const foreign = await upload(tokenFor(otherOwner), 'brief.pdf', 'application/pdf', pdf)
    const wrongOwner = await send({ name: foreign.name, type: foreign.type, size: foreign.size, uploadId: foreign.id })
    assert.equal(wrongOwner.status, 404)

    // Inline file data is refused, as a data URI or as a data field.
    const inline = await send(legacyInline)
    assert.equal(inline.status, 400)
    assert.match((await inline.json() as { error: string }).error, /POST \/api\/uploads/)
    const inlineField = await send({ ...metadata, data: png.toString('base64') })
    assert.equal(inlineField.status, 400)

    // Metadata that does not match the stored record is refused.
    assert.equal((await send({ ...metadata, size: metadata.size + 1 })).status, 400)
    assert.equal((await send({ ...metadata, name: 'renamed.png' })).status, 400)

    // An upload already used by the file directory is refused.
    const filed = await upload(senderToken, 'filed.pdf', 'application/pdf', pdf)
    folderId = (await prisma.fileFolder.create({ data: { name: 'filed.pdf', type: 'file', department: 'Operations', uploadId: filed.id } })).id
    assert.equal((await send({ name: filed.name, type: filed.type, size: filed.size, uploadId: filed.id })).status, 404)

    // Only the accepted message was stored.
    assert.equal(await prisma.message.count({ where: { conversationId: conversation.id } }), 1)

    // The other participant can read the file; someone outside the conversation cannot.
    const participantFetch = await call(tokenFor(recipient), filePath(image.id))
    assert.equal(participantFetch.status, 200)
    assert.deepEqual(Buffer.from(await participantFetch.arrayBuffer()), png)
    assert.equal((await call(tokenFor(outsider), filePath(image.id))).status, 404)

    // An older message with the file inline comes back exactly as stored, next to the new shape.
    const legacy = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: recipient.id, content: '', attachment: legacyInline },
    })
    const listed = await call(tokenFor(recipient), messagesPath)
    assert.equal(listed.status, 200)
    const list = await listed.json() as MessageBody[]
    assert.equal(list.find((message) => message.id === legacy.id)?.attachment, legacyInline)
    assert.equal(list.find((message) => message.id === sentBody.id)?.attachment, JSON.stringify(metadata))

    // Deleting a message deletes its file, but not while another message still uses it.
    const again = await send(metadata, 'same file again')
    assert.equal(again.status, 201)
    const againBody = await again.json() as MessageBody
    assert.equal((await call(senderToken, `/chat/messages/${sentBody.id}`, { method: 'DELETE' })).status, 200)
    assert.equal((await call(tokenFor(recipient), filePath(image.id))).status, 200, 'still used by the second message')
    assert.equal((await call(senderToken, `/chat/messages/${againBody.id}`, { method: 'DELETE' })).status, 200)
    assert.equal(await prisma.storedUpload.findUnique({ where: { id: image.id } }), null)
    assert.equal(fs.existsSync(path.join(uploadDir, image.filename)), false)
    assert.equal((await call(tokenFor(recipient), filePath(image.id))).status, 404)

    console.log('chat.attachments tests passed')
  } finally {
    for (const filename of uploadedFilenames) fs.rmSync(path.join(uploadDir, filename), { force: true })
    await closeServer(server)
    if (folderId) await prisma.fileFolder.delete({ where: { id: folderId } })
    await prisma.conversation.delete({ where: { id: conversation.id } })
    await prisma.storedUpload.deleteMany({ where: { ownerId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
}

runChatAttachmentTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
