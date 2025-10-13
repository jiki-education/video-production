#!/bin/bash

# Setup Test Database Script
#
# Creates the test database and runs migrations.
# Run this once before running tests for the first time.

set -e  # Exit on error

DB_NAME="jiki_video_pipelines_test"

echo "🔧 Setting up test database..."

# Check if database exists, drop if it does
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "   Dropping existing database: $DB_NAME"
  dropdb "$DB_NAME"
fi

# Create test database
echo "   Creating database: $DB_NAME"
createdb "$DB_NAME"

# Run migrations using the db:init script
echo "   Running migrations..."
TEST_DATABASE_URL="postgresql://localhost:5432/$DB_NAME" pnpm db:init

echo "✅ Test database setup complete!"
echo ""
echo "You can now run tests with:"
echo "  pnpm test"
