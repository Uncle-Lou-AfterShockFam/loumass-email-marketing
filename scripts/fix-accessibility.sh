#!/bin/bash

# Fix white-on-white contrast issues and improve accessibility

echo "🎨 Fixing accessibility and contrast issues..."

# Update all bg-white to include dark mode support and better contrast
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/className="bg-white/className="bg-white dark:bg-gray-800/g' {} \;

# Update shadows for dark mode
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/shadow-xl/shadow-xl dark:shadow-2xl dark:shadow-gray-900/g' {} \;

find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/rounded-lg shadow/rounded-lg shadow dark:shadow-lg/g' {} \;

# Fix text colors for better contrast
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/text-gray-500/text-gray-600 dark:text-gray-400/g' {} \;

find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/text-gray-700/text-gray-800 dark:text-gray-200/g' {} \;

find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/text-gray-900/text-gray-900 dark:text-gray-100/g' {} \;

# Fix border colors
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/border-gray-200/border-gray-200 dark:border-gray-700/g' {} \;

find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/border-gray-300/border-gray-300 dark:border-gray-600/g' {} \;

# Fix divide colors
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/divide-gray-200/divide-gray-200 dark:divide-gray-700/g' {} \;

# Update hover states for better visibility
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/hover:bg-gray-50/hover:bg-gray-50 dark:hover:bg-gray-700/g' {} \;

find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/hover:bg-gray-100/hover:bg-gray-100 dark:hover:bg-gray-700/g' {} \;

# Fix table header backgrounds
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/bg-gray-50/bg-gray-50 dark:bg-gray-800/g' {} \;

# Fix input fields
find src/components -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  's/"bg-white px-3/"bg-white dark:bg-gray-800 px-3/g' {} \;

echo "✅ Accessibility fixes applied!"
echo ""
echo "📋 Changes made:"
echo "  - Added dark mode support to all white backgrounds"
echo "  - Improved text contrast ratios"
echo "  - Fixed border and divide colors for dark mode"
echo "  - Enhanced hover states visibility"
echo "  - Updated input fields for better contrast"
echo ""
echo "🔍 Next steps:"
echo "  1. Run 'npm run dev' to test locally"
echo "  2. Test with browser's dark mode enabled"
echo "  3. Use Chrome DevTools Lighthouse for accessibility audit"