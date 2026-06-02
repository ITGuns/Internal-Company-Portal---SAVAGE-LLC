process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.JWT_SECRET ||= 'test-runner-jwt-secret'
process.env.REFRESH_TOKEN_SECRET ||= 'test-runner-refresh-secret'

const tests = [
  './tasks.permissions.test',
  './daily-logs.department.test',
  './signup.requests.test',
  './payroll.permissions.test',
  './users.security.test',
  './auth.security.test',
  './employees.security.test',
  './employees.routes.test',
  './chat.permissions.test',
  './socket.authorization.test',
  './clients.access.test',
  './clients.activity.test',
  './clients.production-records.test',
  './cors.config.test',
  './security.middleware.test',
  './upload.validation.test',
  './clients.routes.test',
  './uploads.routes.test',
]

async function runTests() {
  for (const test of tests) {
    await import(test)
  }
}

runTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
