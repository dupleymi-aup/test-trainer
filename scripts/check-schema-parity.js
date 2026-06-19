const fs = require('fs')
const path = require('path')

const PRISMA_DIR = path.resolve(__dirname, '..', 'prisma')
const SCHEMA_SQLITE = path.join(PRISMA_DIR, 'schema.prisma')
const SCHEMA_POSTGRES = path.join(PRISMA_DIR, 'schema.postgresql.prisma')

function parseModels(content) {
  const models = {}
  const modelRegex = /^model\s+(\w+)\s*\{([\s\S]*?)\n\}/gm
  let match
  while ((match = modelRegex.exec(content)) !== null) {
    const name = match[1]
    const body = match[2]
    const fields = body
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('@@'))
      .map(l => {
        const parts = l.split(/\s+/)
        return { name: parts[0], type: parts[1], modifiers: parts.slice(2).join(' ') }
      })
    models[name] = fields
  }
  return models
}

function parseEnums(content) {
  const enums = {}
  const enumRegex = /^enum\s+(\w+)\s*\{([\s\S]*?)\n\}/gm
  let match
  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[1]
    const values = match[2]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//'))
    enums[name] = values
  }
  return enums
}

function main() {
  const sqliteContent = fs.readFileSync(SCHEMA_SQLITE, 'utf-8')
  const postgresContent = fs.readFileSync(SCHEMA_POSTGRES, 'utf-8')

  const sqliteModels = parseModels(sqliteContent)
  const postgresModels = parseModels(postgresContent)
  const sqliteEnums = parseEnums(sqliteContent)
  const postgresEnums = parseEnums(postgresContent)

  const errors = []

  const allModels = new Set([...Object.keys(sqliteModels), ...Object.keys(postgresModels)])
  for (const model of allModels) {
    if (!sqliteModels[model]) {
      errors.push(`Model "${model}" exists in PostgreSQL but missing in SQLite`)
    } else if (!postgresModels[model]) {
      errors.push(`Model "${model}" exists in SQLite but missing in PostgreSQL`)
    } else {
      const sqliteFields = new Map(sqliteModels[model].map(f => [f.name, f]))
      const postgresFields = new Map(postgresModels[model].map(f => [f.name, f]))
      const allFields = new Set([...sqliteFields.keys(), ...postgresFields.keys()])
      for (const field of allFields) {
        if (!sqliteFields.has(field)) {
          errors.push(`Model "${model}": field "${field}" missing in SQLite`)
        } else if (!postgresFields.has(field)) {
          errors.push(`Model "${model}": field "${field}" missing in PostgreSQL`)
        } else {
          const sf = sqliteFields.get(field)
          const pf = postgresFields.get(field)
          const sfType = sf.type.toLowerCase()
          const pfType = pf.type.toLowerCase()
          if (sfType !== pfType) {
            const typeMap = { datetime: 'timestamp', json: 'jsonb' }
            const expectedPgType = typeMap[sfType] || sfType
            if (expectedPgType !== pfType) {
              errors.push(`Model "${model}": field "${field}" type mismatch — SQLite="${sf.type}", PostgreSQL="${pf.type}"`)
            }
          }
        }
      }
    }
  }

  const allEnums = new Set([...Object.keys(sqliteEnums), ...Object.keys(postgresEnums)])
  for (const enumName of allEnums) {
    if (!sqliteEnums[enumName]) {
      errors.push(`Enum "${enumName}" exists in PostgreSQL but missing in SQLite`)
    } else if (!postgresEnums[enumName]) {
      errors.push(`Enum "${enumName}" exists in SQLite but missing in PostgreSQL`)
    } else {
      const sqliteVals = new Set(sqliteEnums[enumName])
      const postgresVals = new Set(postgresEnums[enumName])
      for (const val of sqliteVals) {
        if (!postgresVals.has(val)) {
          errors.push(`Enum "${enumName}": value "${val}" missing in PostgreSQL`)
        }
      }
      for (const val of postgresVals) {
        if (!sqliteVals.has(val)) {
          errors.push(`Enum "${enumName}": value "${val}" missing in SQLite`)
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('Schema parity check FAILED:')
    errors.forEach(e => console.error(`  ✗ ${e}`))
    process.exit(1)
  } else {
    console.log(`Schema parity check passed — ${Object.keys(sqliteModels).length} models, ${Object.keys(sqliteEnums).length} enums in sync`)
  }
}

main()
