import assert from 'node:assert/strict'
import { stripImageMetadata } from '../src/uploads/image-metadata'

function buildJpegWithExif(): Buffer {
  const soi = Buffer.from([0xff, 0xd8])
  // APP1: FF E1, length (12 = 2 length bytes + 10 payload), "Exif\0\0" + fake GPS bytes.
  const app1 = Buffer.from([
    0xff, 0xe1, 0x00, 0x0c,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x00, 0x11, 0x22, 0x33,
  ])
  const dqt = Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x00, 0x00]) // quantization table (kept)
  const eoi = Buffer.from([0xff, 0xd9])
  return Buffer.concat([soi, app1, dqt, eoi])
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.from([0x00, 0x00, 0x00, 0x00]) // CRC not validated by the stripper
  return Buffer.concat([length, Buffer.from(type, 'ascii'), data, crc])
}

function buildPngWithExif(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = pngChunk('IHDR', Buffer.alloc(13, 0x01))
  const exif = pngChunk('eXIf', Buffer.from([0x00, 0x11, 0x22, 0x33]))
  const iend = pngChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([signature, ihdr, exif, iend])
}

function run(): void {
  // JPEG: APP1/EXIF removed, image-structural segments kept.
  const jpeg = buildJpegWithExif()
  const strippedJpeg = stripImageMetadata(jpeg, 'image/jpeg')
  assert.ok(strippedJpeg.length < jpeg.length, 'JPEG shrinks after stripping EXIF')
  assert.equal(strippedJpeg.includes(Buffer.from('Exif')), false, 'the Exif marker is gone')
  assert.equal(strippedJpeg.includes(Buffer.from([0xff, 0xe1])), false, 'the APP1 segment is gone')
  assert.ok(strippedJpeg.includes(Buffer.from([0xff, 0xdb])), 'the quantization table is preserved')
  assert.deepEqual(strippedJpeg.subarray(0, 2), Buffer.from([0xff, 0xd8]), 'SOI preserved')
  assert.deepEqual(strippedJpeg.subarray(-2), Buffer.from([0xff, 0xd9]), 'EOI preserved')

  // PNG: eXIf chunk removed, IHDR/IEND kept.
  const png = buildPngWithExif()
  const strippedPng = stripImageMetadata(png, 'image/png')
  assert.ok(strippedPng.length < png.length, 'PNG shrinks after stripping metadata')
  assert.equal(strippedPng.includes(Buffer.from('eXIf')), false, 'the eXIf chunk is gone')
  assert.ok(strippedPng.includes(Buffer.from('IHDR')), 'IHDR preserved')
  assert.ok(strippedPng.includes(Buffer.from('IEND')), 'IEND preserved')

  // Formats we do not touch are returned unchanged (same bytes).
  const gif = Buffer.from('GIF89a-not-a-real-gif')
  assert.equal(stripImageMetadata(gif, 'image/gif'), gif, 'GIF is returned unchanged')

  // Non-image / mismatched content-type is returned unchanged and never throws.
  const notImage = Buffer.from('this is not an image at all')
  assert.equal(stripImageMetadata(notImage, 'image/jpeg'), notImage, 'a non-JPEG body is returned unchanged')
}

run()
console.log('image-metadata tests passed')
