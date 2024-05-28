#!/bin/sh

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

sui keytool import "$PRIVATE_KEY_MNEMONIC" ed25519

# Start the application
exec "$@"
