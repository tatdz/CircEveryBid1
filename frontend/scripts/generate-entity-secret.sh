#!/bin/bash
# Generate Circle Entity Secret

# Generate 32-byte random hex string
ENTITY_SECRET=$(openssl rand -hex 32)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Generated Entity Secret:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo $ENTITY_SECRET
echo ""
echo "⚠️  SAVE THIS SECURELY!"
echo ""
echo "Add to your .env.local:"
echo "CIRCLE_ENTITY_SECRET=$ENTITY_SECRET"
echo ""
