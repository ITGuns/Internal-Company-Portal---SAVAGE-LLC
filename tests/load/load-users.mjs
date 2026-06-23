function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  values.push(value.trim())
  return values
}

export function parseLoadUsers(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []
  const [emailHeader, passwordHeader] = parseCsvLine(lines[0]).map((value) => value.toLowerCase())
  if (emailHeader !== 'email' || passwordHeader !== 'password') {
    throw new Error('Load user CSV must start with email,password')
  }

  const seen = new Set()
  return lines.slice(1).map((line, index) => {
    const [email, password] = parseCsvLine(line)
    if (!email || !password) throw new Error(`Load user row ${index + 2} requires email and password`)
    const normalizedEmail = email.toLowerCase()
    if (seen.has(normalizedEmail)) throw new Error(`Duplicate email in load user CSV: ${email}`)
    seen.add(normalizedEmail)
    return { email, password }
  })
}

export function selectLoadUser(users, vuNumber) {
  if (!users.length) throw new Error('No load test users are configured')
  return users[(vuNumber - 1) % users.length]
}

export function validateLoadUserPool(profile, users, requiredUsers) {
  if (!users.length) throw new Error('Configure DESKII_LOAD_USERS_FILE or smoke credentials')
  if (profile === 'commercial1000' && users.length < requiredUsers) {
    throw new Error(`commercial1000 requires at least ${requiredUsers} unique test users`)
  }
}
