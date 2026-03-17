#!/bin/bash

# Fix crypto$2.getRandomValues error in Vite

echo "=== Fixing crypto error in team-up project ==="
echo ""

# Check current directory
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Step 1: Remove old dependencies
echo "Step 1: Removing node_modules and package-lock.json..."
rm -rf node_modules
rm package-lock.json
echo "✓ Cleanup complete"
echo ""

# Step 2: Fresh install
echo "Step 2: Running fresh npm install..."
npm install
if [ $? -eq 0 ]; then
    echo "✓ npm install successful"
else
    echo "✗ npm install failed"
    exit 1
fi
echo ""

# Step 3: Try running dev server
echo "Step 3: Starting dev server..."
npm run dev

