import assert from 'node:assert/strict'
import {
  buildAllowedCorsOrigins,
  parseCorsOrigins,
  resolveCorsResponseOrigin,
} from '../src/config/cors.config'

assert.deepEqual(
  parseCorsOrigins(' https://preview.example.com, http://localhost:3000 ,, http://localhost:3001 '),
  ['https://preview.example.com', 'http://localhost:3000', 'http://localhost:3001'],
)

const developmentOrigins = buildAllowedCorsOrigins('http://localhost:3000', 'development')
assert.equal(developmentOrigins.includes('http://localhost:3000'), true)
assert.equal(developmentOrigins.includes('http://localhost:3001'), true)
assert.equal(developmentOrigins.includes('http://127.0.0.1:3001'), true)
assert.equal(resolveCorsResponseOrigin('http://localhost:3001', developmentOrigins), 'http://localhost:3001')
assert.equal(resolveCorsResponseOrigin('https://evil.example', developmentOrigins), undefined)
assert.equal(resolveCorsResponseOrigin(undefined, developmentOrigins), 'http://localhost:3000')

const productionOrigins = buildAllowedCorsOrigins('https://portal.example.com', 'production')
assert.deepEqual(productionOrigins, ['https://portal.example.com'])
assert.equal(resolveCorsResponseOrigin('http://localhost:3001', productionOrigins), undefined)
