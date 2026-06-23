import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { parseLoadUsers, selectLoadUser, validateLoadUserPool } from './load-users.mjs'

const baseUrl = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const apiUrl = (__ENV.API_URL || `${baseUrl}/api`).replace(/\/+$/, '')
const authUrl = (__ENV.AUTH_URL || `${baseUrl}/backend-auth`).replace(/\/+$/, '')
const profile = (__ENV.LOAD_PROFILE || 'smoke').toLowerCase()
const commercialVus = Number.parseInt(__ENV.COMMERCIAL_VUS || '1000', 10)
const usersFile = __ENV.DESKII_LOAD_USERS_FILE
const fileUsers = usersFile ? parseLoadUsers(open(usersFile)) : []
const smokeUsers = __ENV.DESKII_LOAD_EMAIL && __ENV.DESKII_LOAD_PASSWORD
  ? [{ email: __ENV.DESKII_LOAD_EMAIL, password: __ENV.DESKII_LOAD_PASSWORD }]
  : []
const loadUsers = fileUsers.length > 0 ? fileUsers : smokeUsers

const loginFailureRate = new Rate('deskii_login_failures')
const apiFailureRate = new Rate('deskii_api_failures')
const loginTrend = new Trend('deskii_login_duration')

const profiles = {
  smoke: {
    vus: 5,
    duration: '1m',
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<1000'],
      deskii_login_failures: ['rate<0.01'],
      deskii_api_failures: ['rate<0.05'],
    },
  },
  commercial1000: {
    stages: [
      { duration: '5m', target: Math.ceil(commercialVus / 4) },
      { duration: '10m', target: commercialVus },
      { duration: '10m', target: commercialVus },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.02'],
      http_req_duration: ['p(95)<750', 'p(99)<1500'],
      deskii_login_failures: ['rate<0.01'],
      deskii_api_failures: ['rate<0.02'],
    },
  },
}

export const options = profiles[profile] || profiles.smoke
validateLoadUserPool(profile, loadUsers, commercialVus)

let accessToken = ''

function login(user) {
  const response = http.post(
    `${authUrl}/login`,
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth/login' },
    },
  )

  loginTrend.add(response.timings.duration)
  const ok = check(response, {
    'login returned 200': (res) => res.status === 200,
    'login returned access token': (res) => Boolean(res.json('tokens.accessToken')),
  })
  loginFailureRate.add(!ok)

  return response
}

function refresh() {
  const response = http.post(`${authUrl}/refresh`, null, {
    tags: { name: 'POST /auth/refresh' },
  })
  const ok = check(response, {
    'refresh returned 200': (res) => res.status === 200,
    'refresh returned access token': (res) => Boolean(res.json('accessToken')),
  })
  apiFailureRate.add(!ok)
  return ok ? String(response.json('accessToken') || '') : ''
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function checkedGet(path, expectedStatus = 200) {
  let response = http.get(`${apiUrl}${path}`, {
    headers: authHeaders(accessToken),
    tags: { name: `GET ${path}` },
  })
  if (response.status === 401 || response.status === 403) {
    const refreshedToken = refresh()
    if (refreshedToken) {
      accessToken = refreshedToken
      response = http.get(`${apiUrl}${path}`, {
        headers: authHeaders(accessToken),
        tags: { name: `GET ${path}` },
      })
    }
  }
  const ok = check(response, {
    [`${path} returned ${expectedStatus}`]: (res) => res.status === expectedStatus,
  })
  apiFailureRate.add(!ok)
  return response
}

export default function runDeskiiCommercialLoad() {
  const user = selectLoadUser(loadUsers, __VU)
  if (!accessToken) {
    group('auth', () => {
      const loginResponse = login(user)
      accessToken = String(loginResponse.json('tokens.accessToken') || '')
    })
  }

  if (!accessToken) {
    sleep(1)
    return
  }

  group('employee workspace read path', () => {
    checkedGet('/tasks')
    checkedGet('/tasks/projects')
    checkedGet('/daily-logs/my-logs')
    checkedGet('/payroll/time-entries/active')
    checkedGet('/chat')
    checkedGet('/notifications')
  })

  sleep(Math.random() * 2 + 1)
}
