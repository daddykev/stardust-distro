#!/bin/bash

echo "🌟 Starting migration from DDEX Distro to Stardust Distro..."
echo ""

# Counter for changes
CHANGES=0

# Step 1: Rename the CLI binary file
echo "📁 Renaming CLI binary..."
if [ -f "cli/bin/ddex-distro.js" ]; then
  mv cli/bin/ddex-distro.js cli/bin/stardust-distro.js
  echo "  ✓ Renamed cli/bin/ddex-distro.js to stardust-distro.js"
  ((CHANGES++))
fi

# Step 2: Move @ddex packages to @stardust-distro
echo "📦 Moving packages to new scope..."
if [ -d "packages/@ddex" ]; then
  mkdir -p packages/@stardust-distro
  mv packages/@ddex/common packages/@stardust-distro/common
  rmdir packages/@ddex 2>/dev/null
  echo "  ✓ Moved packages/@ddex/common to packages/@stardust-distro/common"
  ((CHANGES++))
fi

# Step 3: Update all file contents
echo "🔄 Updating file contents..."

# List of all file patterns to update
find . -type f \( \
  -name "*.js" -o \
  -name "*.ts" -o \
  -name "*.vue" -o \
  -name "*.json" -o \
  -name "*.md" -o \
  -name "*.html" -o \
  -name "*.css" -o \
  -name "*.yaml" -o \
  -name "*.yml" \
  \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/.firebase/*" \
  -not -path "./migrate.sh" \
  -print0 | while IFS= read -r -d '' file; do
  
  # Create backup
  cp "$file" "$file.backup"
  
  # Perform replacements
  sed -i '' \
    -e 's/ddex-distro/stardust-distro/g' \
    -e 's/DDEX Distro/Stardust Distro/g' \
    -e 's/DDEX-Distro/Stardust-Distro/g' \
    -e 's/@ddex/@stardust-distro/g' \
    -e 's/create-ddex-distro/create-stardust-distro/g' \
    -e 's/ddex_distro/stardust_distro/g' \
    -e 's/ddexDistro/stardustDistro/g' \
    -e 's/DdexDistro/StardustDistro/g' \
    "$file"
  
  # Check if file changed
  if ! cmp -s "$file" "$file.backup"; then
    echo "  ✓ Updated: $file"
    ((CHANGES++))
    rm "$file.backup"
  else
    rm "$file.backup"
  fi
done

# Step 4: Update package.json bin field specifically
echo "📝 Updating CLI package.json bin field..."
if [ -f "cli/package.json" ]; then
  sed -i '' 's/"ddex-distro":/"stardust-distro":/g' cli/package.json
  echo "  ✓ Updated CLI bin reference"
fi

# Step 5: Special handling for .firebaserc
echo "🔥 Updating Firebase configuration..."
if [ -f ".firebaserc" ]; then
  cat > .firebaserc << 'EOF'
{
  "projects": {
    "default": "stardust-distro"
  }
}
EOF
  echo "  ✓ Updated .firebaserc"
  ((CHANGES++))
fi

echo ""
echo "✅ Migration complete! Made $CHANGES changes."
echo ""
echo "⚠️  Next manual steps:"
echo "  1. Update .env file with new Firebase configuration"
echo "  2. Review the changes with: git diff"
echo "  3. Test the CLI: cd cli && npm link && stardust-distro --help"
echo "  4. Test the app: cd template && npm install && npm run dev"
