/**
 * Database Initialization Script
 *
 * Creates PostgreSQL database schema for the pipeline system.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   pnpm db:init
 */

import "dotenv/config";
import { closePool, initializeSchema } from "../src/lib/db";

async function main() {
  console.log("Initializing PostgreSQL database...\n");

  try {
    // Validate DATABASE_URL exists
    if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === "") {
      console.error("✗ DATABASE_URL environment variable is not set");
      console.error("\nPlease create a .env file with:");
      console.error("DATABASE_URL=postgresql://localhost:5432/jiki_video_pipelines\n");
      process.exit(1);
    }

    console.log(`Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}\n`);

    // Initialize schema (this will also create the connection pool)
    await initializeSchema();

    console.log("\n✓ Database initialization complete");
    console.log("  Tables: pipelines, nodes");
    console.log("  Indexes: idx_nodes_status, idx_pipelines_updated");

    // Close connection pool
    await closePool();
  } catch (error) {
    console.error("\n✗ Database initialization failed:");

    if (error instanceof Error) {
      console.error(`  ${error.message}\n`);

      // Provide helpful error messages for common issues
      if (error.message.includes("ECONNREFUSED")) {
        console.error("Hint: Is PostgreSQL running? Try:");
        console.error("  brew services start postgresql (macOS)");
        console.error("  sudo service postgresql start (Linux)\n");
      } else if (error.message.includes("does not exist")) {
        console.error("Hint: Create the database first:");
        console.error(`  createdb jiki_video_pipelines\n`);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

void main();
