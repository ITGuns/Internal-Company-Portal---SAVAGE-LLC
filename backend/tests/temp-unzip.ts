import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const docxPath = path.resolve(__dirname, '..', '..', 'Deskii_Design_QA.docx')
const data = fs.readFileSync(docxPath)

const targetFile = Buffer.from('word/document.xml')
let index = data.indexOf(targetFile)

if (index === -1) {
  console.error("Target file not found in zip")
  process.exit(1)
}

let headerIndex = -1
for (let i = index; i >= 0; i--) {
  if (data[i] === 0x50 && data[i+1] === 0x4b && data[i+2] === 0x03 && data[i+3] === 0x04) {
    headerIndex = i
    break
  }
}

if (headerIndex === -1) {
  console.error("Local file header not found")
  process.exit(1)
}

const compressionMethod = data.readUInt16LE(headerIndex + 8)
const compressedSize = data.readUInt32LE(headerIndex + 18)
const fileNameLength = data.readUInt16LE(headerIndex + 26)
const extraFieldLength = data.readUInt16LE(headerIndex + 28)

const dataOffset = headerIndex + 30 + fileNameLength + extraFieldLength
const compressedData = data.subarray(dataOffset, dataOffset + compressedSize)

if (compressionMethod === 8) {
  zlib.inflateRaw(compressedData, (err, decompressed) => {
    if (err) {
      console.error("Decompression failed:", err)
      process.exit(1)
    }
    const dest = path.resolve(__dirname, 'temp-document.xml')
    fs.writeFileSync(dest, decompressed)
    console.log("Successfully extracted word/document.xml to", dest)
  })
}
