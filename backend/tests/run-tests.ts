import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.JWT_SECRET ||= 'test-runner-jwt-secret'
process.env.REFRESH_TOKEN_SECRET ||= 'test-runner-refresh-secret'

const tests = [
  'tasks.permissions.test.ts',
  'daily-logs.department.test.ts',
  'signup.requests.test.ts',
  'payroll.permissions.test.ts',
  'users.security.test.ts',
  'auth.security.test.ts',
  'auth.routes.test.ts',
  'employees.security.test.ts',
  'employees.routes.test.ts',
  'chat.limits.test.ts',
  'chat.permissions.test.ts',
  'socket.authorization.test.ts',
  'clients.access.test.ts',
  'clients.activity.test.ts',
  'clients.production-records.test.ts',
  'cors.config.test.ts',
  'security.middleware.test.ts',
  'json-body-limits.test.ts',
  'upload.validation.test.ts',
  'clients.routes.test.ts',
  'uploads.routes.test.ts',
]

function runTest(test: string): Promise<void> {
  const testPath = path.join(__dirname, test)

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', testPath],
      {
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
      },
    )

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${test} failed with exit code ${code}`))
    })
  })
}

async function runTests() {
  for (const test of tests) {
    await runTest(test)
  }
}

runTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
