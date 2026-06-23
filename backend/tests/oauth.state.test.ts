import assert from 'node:assert/strict'
import {
  buildOAuthStateCookieName,
  getOAuthStateFromRequest,
} from '../src/auth/oauth.state'

function runOAuthStateTests() {
  assert.equal(buildOAuthStateCookieName('google'), 'deskii_google_oauth_state')
  assert.equal(buildOAuthStateCookieName('discord'), 'deskii_discord_oauth_state')
  assert.equal(buildOAuthStateCookieName('apple'), 'deskii_apple_oauth_state')

  assert.equal(
    getOAuthStateFromRequest({ cookies: { deskii_google_oauth_state: 'state-123' } } as any, 'google'),
    'state-123',
  )
  assert.equal(
    getOAuthStateFromRequest(
      { headers: { cookie: 'other=value; deskii_google_oauth_state=state-raw%20123' } } as any,
      'google',
    ),
    'state-raw 123',
  )
  assert.equal(getOAuthStateFromRequest({ cookies: {} } as any, 'google'), '')
}

runOAuthStateTests()
console.log('oauth.state tests passed')
