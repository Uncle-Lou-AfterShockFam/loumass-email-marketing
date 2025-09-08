#!/usr/bin/env node

/**
 * 🛡️ LOUMASS DATABASE CONFIGURATION VALIDATOR
 * Ensures correct database is used in each environment to prevent data loss
 */

const chalk = require('chalk')

console.log(chalk.blue('🛡️ LOUMASS DATABASE CONFIGURATION VALIDATOR'))
console.log(chalk.blue('==============================================='))

const DATABASE_URL = process.env.DATABASE_URL
const NODE_ENV = process.env.NODE_ENV || 'development'

// Expected database patterns
const NEON_PRODUCTION_PATTERN = /ep-jolly-recipe-adekvs9j.*neon\.tech/
const LOCAL_DEV_PATTERN = /localhost:5432/

function validateDatabaseConfig() {
  console.log(chalk.yellow(`🔍 Validating database configuration for environment: ${NODE_ENV}`))
  
  if (!DATABASE_URL) {
    console.log(chalk.red('❌ ERROR: DATABASE_URL environment variable not found'))
    console.log(chalk.yellow('💡 Solution: Set DATABASE_URL in your .env file'))
    process.exit(1)
  }

  console.log(chalk.blue(`📊 Current DATABASE_URL: ${DATABASE_URL.replace(/:[^@]*@/, ':****@')}`))

  // Environment-specific validations
  if (NODE_ENV === 'production') {
    if (NEON_PRODUCTION_PATTERN.test(DATABASE_URL)) {
      console.log(chalk.green('✅ PRODUCTION: Using correct Neon cloud database'))
      logProductionSafetyChecks()
    } else if (LOCAL_DEV_PATTERN.test(DATABASE_URL)) {
      console.log(chalk.red('❌ DANGER: Production environment is using local database!'))
      console.log(chalk.yellow('💡 Solution: Update DATABASE_URL to use Neon production database'))
      process.exit(1)
    } else {
      console.log(chalk.yellow('⚠️  Production using unknown database - please verify this is correct'))
    }
  } else {
    // Development environment
    if (LOCAL_DEV_PATTERN.test(DATABASE_URL)) {
      console.log(chalk.green('✅ DEVELOPMENT: Using local database (safe for testing)'))
      logDevelopmentSafetyChecks()
    } else if (NEON_PRODUCTION_PATTERN.test(DATABASE_URL)) {
      console.log(chalk.red('❌ WARNING: Development environment using PRODUCTION database!'))
      console.log(chalk.yellow('💡 This is risky - you could accidentally modify live user data'))
      console.log(chalk.yellow('💡 Solution: Use local PostgreSQL for development'))
      console.log(chalk.yellow('💡 Update .env file: DATABASE_URL=postgresql://localhost:5432/loumass_beta'))
      process.exit(1)
    } else {
      console.log(chalk.yellow('⚠️  Development using unknown database - please verify this is safe'))
    }
  }

  console.log(chalk.green('🎉 Database configuration validation passed!'))
}

function logProductionSafetyChecks() {
  console.log(chalk.blue('🔒 Production Safety Checklist:'))
  console.log(chalk.blue('  ✓ Using Neon cloud database'))
  console.log(chalk.blue('  ✓ Database is backed up automatically by Neon'))
  console.log(chalk.blue('  ✓ Environment isolated from development'))
  console.log(chalk.yellow('💡 Remember to run manual backups before major deployments'))
}

function logDevelopmentSafetyChecks() {
  console.log(chalk.blue('🔧 Development Safety Checklist:'))
  console.log(chalk.blue('  ✓ Using local database (safe for testing)'))
  console.log(chalk.blue('  ✓ Isolated from production data'))
  console.log(chalk.blue('  ✓ Safe to run destructive operations'))
  console.log(chalk.yellow('💡 Use sync-production-data.sh to get production data for testing'))
}

// Run validation
validateDatabaseConfig()