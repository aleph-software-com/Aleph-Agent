#!/bin/sh

# Auto-generate ENCRYPTION_KEY if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "Generated ENCRYPTION_KEY=$ENCRYPTION_KEY"
fi

exec "$@"
