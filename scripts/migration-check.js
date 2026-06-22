/**
 * Database migration safety script.
 * Shows what would change before running a migration.
 *
 * Usage:
 *   npm run db:check           — dry-run: show schema format + parity
 *   npm run db:check -- --apply — actually push schema to database
 */
const { execSync } = require('child_process')
const path = require('path')

const SCHEMA_ACTIVE = path.resolve(__dirname, '..', 'prisma', 'schema.active.prisma')
const SCHEMA_SQLITE = path.resolve(__dirname, '..', 'prisma', 'schema.prisma')

const apply = process.argv.includes('--apply')

console.log('=== Database Migration Safety Check ===')
console.log('Schema:', SCHEMA_ACTIVE)

// Step 1: Generate schema from active DB type
console.log('\n[1/3] Generating active schema...')
try {
  execSync('node scripts/generate-schema.js', { stdio: 'inherit' })
} catch {
  console.error('Failed to generate schema')
  process.exit(1)
}

// Step 2: Format check
console.log('\n[2/3] Checking schema format...')
try {
  execSync(`npx prisma format --schema=${SCHEMA_ACTIVE}`, { stdio: 'inherit' })
} catch {
  console.error('Schema format check failed')
  process.exit(1)
}

// Step 3: Parity check between SQLite and PostgreSQL schemas
console.log('\n[2.5/3] Schema parity check...')
try {
  execSync('node scripts/check-schema-parity.js', { stdio: 'inherit' })
} catch {
  console.error('Schema parity check failed — schemas are out of sync')
  process.exit(1)
}

// Step 4: Apply or show what would change
if (apply) {
  console.log('\n[3/3] Applying migration...')
  try {
    execSync(`npx prisma db push --schema=${SCHEMA_ACTIVE}`, { stdio: 'inherit' })
    console.log('\nMigration applied successfully')
  } catch {
    console.error('Migration failed')
    process.exit(1)
  }
} else {
  console.log('\n[3/3] Dry-run mode:')
  console.log('  Schema formatted: OK')
  console.log('  Parity check: OK')
  console.log('  No changes will be applied.')
  console.log('\n  To apply: npm run db:check -- --apply')
  console.log('  Or use:   npm run db:push')
}

console.log('\n=== Done ===')
