import assert from 'node:assert/strict'
import {
  decodeBase64Payload,
  normalizeMimeType,
  validateStoredAvatarValue,
  validateAvatarContent,
  validateUploadContent,
} from '../src/uploads/upload.validation'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00])
const gif = Buffer.from('GIF89a-demo', 'ascii')
const webp = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0x00, 0x00, 0x00, 0x00]), Buffer.from('WEBP', 'ascii')])
const pdf = Buffer.from('%PDF-1.7\n', 'ascii')
const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00])
const docx = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('[Content_Types].xml word/document.xml', 'utf8'),
])

assert.equal(normalizeMimeType('image/jpg'), 'image/jpeg')

assert.equal(validateUploadContent('image/png', png), 'image/png')
assert.equal(validateUploadContent('image/jpeg', jpeg), 'image/jpeg')
assert.equal(validateUploadContent('image/gif', gif), 'image/gif')
assert.equal(validateUploadContent('application/pdf', pdf), 'application/pdf')
assert.equal(validateUploadContent('application/msword', doc), 'application/msword')
assert.equal(
  validateUploadContent('application/vnd.openxmlformats-officedocument.wordprocessingml.document', docx),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
)
assert.equal(validateUploadContent('text/plain', Buffer.from('Plain text upload\n', 'utf8')), 'text/plain')

assert.equal(validateUploadContent('image/png', pdf), null)
assert.equal(validateUploadContent('text/plain', Buffer.from([0x00, 0x01, 0x02])), null)
assert.equal(validateUploadContent('application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('PK fake zip')), null)

const decoded = decodeBase64Payload(`data:image/png;base64,${png.toString('base64')}`)
assert.ok(decoded)
assert.equal(decoded.mediaType, 'image/png')
assert.deepEqual(decoded.buffer, png)
assert.equal(decodeBase64Payload('not-base64!'), null)

assert.equal(validateAvatarContent('jpg', jpeg), 'jpeg')
assert.equal(validateAvatarContent('image/png', png), 'png')
assert.equal(validateAvatarContent('gif', gif), 'gif')
assert.equal(validateAvatarContent('webp', webp), 'webp')
assert.equal(validateAvatarContent('webp', png), null)

assert.equal(validateStoredAvatarValue(`data:image/png;base64,${png.toString('base64')}`).valid, true)
assert.equal(validateStoredAvatarValue(`data:image/png;base64,${pdf.toString('base64')}`).valid, false)
assert.equal(validateStoredAvatarValue(`data:image/svg+xml;base64,${Buffer.from('<svg />').toString('base64')}`).valid, false)
assert.equal(validateStoredAvatarValue('https://example.test/avatar.png').valid, true)
assert.equal(validateStoredAvatarValue('').valid, true)
assert.equal(validateStoredAvatarValue(42).valid, false)

console.log('upload.validation tests passed')
