import assert from 'node:assert/strict'
import {
  parseLoadUsers,
  selectLoadUser,
  validateLoadUserPool,
} from './load-users.mjs'

const users = parseLoadUsers(`email,password
user-1@example.com,Password-1
user-2@example.com,Password-2
`)

assert.deepEqual(users, [
  { email: 'user-1@example.com', password: 'Password-1' },
  { email: 'user-2@example.com', password: 'Password-2' },
])
assert.deepEqual(selectLoadUser(users, 1), users[0])
assert.deepEqual(selectLoadUser(users, 2), users[1])
assert.deepEqual(selectLoadUser(users, 3), users[0])
assert.doesNotThrow(() => validateLoadUserPool('smoke', users, 5))
assert.throws(
  () => validateLoadUserPool('commercial1000', users, 1000),
  /requires at least 1000 unique test users/i,
)
assert.throws(
  () => parseLoadUsers('email,password\nduplicate@example.com,a\nduplicate@example.com,b\n'),
  /duplicate email/i,
)

console.log('load-users tests passed')
