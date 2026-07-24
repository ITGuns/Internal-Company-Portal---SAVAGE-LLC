// Strip location/metadata from uploaded images before they are stored.
//
// Phone photos carry GPS coordinates in EXIF (JPEG APP1) and occasionally in a PNG eXIf chunk.
// The upload pipeline only accepts PNG / JPEG / GIF images (see upload.validation.ts), and GIF
// carries no GPS, so removing the JPEG APP1 segment and the PNG metadata chunks fully covers the
// GPS-leak surface for the allowed formats - no native image library required.
//
// Every function fails safe: on any malformed/unexpected structure it returns the original bytes
// unchanged rather than risk corrupting the image (a metadata byte is a smaller problem than a
// broken upload). The trade-off vs `sharp`: this does not re-encode or cover HEIC/TIFF, which are
// not accepted upload types anyway. See docs/gemfield-bridge/DECISIONS.md (D4).

const JPEG_APP1 = 0xe1 // EXIF + XMP live here

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt'])

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)
}

function stripJpeg(buffer: Buffer): Buffer {
  const output: Buffer[] = [Buffer.from([0xff, 0xd8])] // SOI
  let offset = 2

  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) return buffer // not a marker where one is expected -> bail safely
    const marker = buffer[offset + 1]

    // Start of scan: compressed image data follows to the end - copy the remainder verbatim.
    if (marker === 0xda) {
      output.push(buffer.subarray(offset))
      return Buffer.concat(output)
    }
    if (marker === 0xd9) {
      // End of image
      output.push(buffer.subarray(offset, offset + 2))
      return Buffer.concat(output)
    }
    // Standalone markers with no length payload (RSTn 0xD0-0xD7, TEM 0x01).
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      output.push(buffer.subarray(offset, offset + 2))
      offset += 2
      continue
    }

    if (offset + 3 >= buffer.length) return buffer
    const segmentLength = buffer.readUInt16BE(offset + 2)
    const segmentEnd = offset + 2 + segmentLength
    if (segmentLength < 2 || segmentEnd > buffer.length) return buffer

    // Drop APP1 (EXIF/XMP - the GPS carrier); keep everything else (APP0/JFIF, quant tables, etc.).
    if (marker !== JPEG_APP1) {
      output.push(buffer.subarray(offset, segmentEnd))
    }
    offset = segmentEnd
  }

  return Buffer.concat(output)
}

function stripPng(buffer: Buffer): Buffer {
  const output: Buffer[] = [PNG_SIGNATURE]
  let offset = 8

  while (offset + 8 <= buffer.length) {
    const dataLength = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const chunkEnd = offset + 12 + dataLength // length(4) + type(4) + data + crc(4)
    if (chunkEnd > buffer.length) return buffer

    if (!PNG_METADATA_CHUNKS.has(type)) {
      output.push(buffer.subarray(offset, chunkEnd))
    }
    offset = chunkEnd
    if (type === 'IEND') break
  }

  return Buffer.concat(output)
}

/** Return a copy of `buffer` with location/metadata removed, or the original for formats we don't touch. */
export function stripImageMetadata(buffer: Buffer, contentType: string): Buffer {
  try {
    const normalized = (contentType || '').toLowerCase()
    if (normalized === 'image/jpeg' && isJpeg(buffer)) return stripJpeg(buffer)
    if (normalized === 'image/png' && isPng(buffer)) return stripPng(buffer)
    return buffer
  } catch {
    return buffer // never let metadata stripping break an otherwise-valid upload
  }
}
