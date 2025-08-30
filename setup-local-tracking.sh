#!/bin/bash

echo "🚀 LOUMASS Local Tracking Setup"
echo "================================"
echo ""
echo "This script will help you test email tracking locally."
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run with sudo: sudo ./setup-local-tracking.sh"
    exit 1
fi

echo "Choose an option:"
echo "1) Enable local tracking (redirect click.aftershockfam.org to localhost)"
echo "2) Disable local tracking (restore normal DNS)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "📝 Adding local tracking domain to /etc/hosts..."
        
        # Remove any existing entries
        sed -i '' '/click.aftershockfam.org/d' /etc/hosts 2>/dev/null || sed -i '/click.aftershockfam.org/d' /etc/hosts
        
        # Add new entry
        echo "127.0.0.1 click.aftershockfam.org" >> /etc/hosts
        
        echo "✅ Local tracking enabled!"
        echo ""
        echo "Now when you click tracking links in emails:"
        echo "  • They will hit your local server at http://localhost:3000"
        echo "  • Tracking events will be recorded in your local database"
        echo "  • Stats will update in real-time"
        echo ""
        echo "⚠️  IMPORTANT: Remember to disable this before production testing!"
        ;;
        
    2)
        echo ""
        echo "🔄 Removing local tracking domain from /etc/hosts..."
        
        # Remove the entry
        sed -i '' '/click.aftershockfam.org/d' /etc/hosts 2>/dev/null || sed -i '/click.aftershockfam.org/d' /etc/hosts
        
        echo "✅ Local tracking disabled!"
        echo ""
        echo "Tracking links will now go to your production server."
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🔄 Flushing DNS cache..."
dscacheutil -flushcache 2>/dev/null || echo "DNS cache flush skipped"

echo ""
echo "✨ Done! You may need to restart your browser for changes to take effect."