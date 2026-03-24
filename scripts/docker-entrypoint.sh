#!/bin/sh

# Exit on error
set -e

# Extract host and port from DATABASE_URL if DB_HOST is not set
# This is a fallback to make it more robust
if [ -z "$DB_HOST" ]; then
  # Example: postgresql://user:password@localhost:5432/dbname
  DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|:.*||' -e 's|/.*||')
fi

if [ -z "$DB_PORT" ]; then
  DB_PORT=5432
fi

if [ -z "$DB_USER" ]; then
  DB_USER=$(echo $DATABASE_URL | sed -e 's|.*//||' -e 's|:.*||')
fi

echo "Waiting for database at $DB_HOST:$DB_PORT..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is up - executing migrations"
npx prisma migrate deploy

echo "Starting application"
exec "$@"
