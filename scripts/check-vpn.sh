#!/bin/bash
# Script to check VPN status for downloads/torrents

echo "🔍 Checking VPN Status for Downloads..."
echo ""

# Check Gluetun status
echo "1️⃣ Gluetun VPN Container:"
if docker compose ps gluetun | grep -q "Up"; then
    echo "   ✅ Gluetun is running"
    
    # Get VPN IP
    VPN_IP=$(docker compose exec -T gluetun wget -qO- https://ifconfig.me/ip 2>/dev/null | head -1)
    if [ -n "$VPN_IP" ]; then
        echo "   📍 VPN Public IP: $VPN_IP"
        
        # Get location info
        LOCATION=$(docker compose exec -T gluetun wget -qO- https://ipinfo.io/json 2>/dev/null | grep -o '"country":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$LOCATION" ]; then
            echo "   🌍 VPN Location: $LOCATION"
        fi
    fi
else
    echo "   ❌ Gluetun is NOT running"
fi

echo ""

# Check aria2 container (should use VPN)
echo "2️⃣ aria2 Container (Torrent Downloads):"
if docker compose ps aria2 | grep -q "Up"; then
    echo "   ✅ aria2 is running"
    
    # Check network mode - compare container IDs
    GLUETUN_ID=$(docker inspect drive-gluetun --format '{{.Id}}' 2>/dev/null)
    ARIA2_NET=$(docker inspect drive-aria2 --format '{{.HostConfig.NetworkMode}}' 2>/dev/null)
    
    if echo "$ARIA2_NET" | grep -q "$GLUETUN_ID" || [ "$ARIA2_NET" = "container:drive-gluetun" ]; then
        echo "   ✅ Network Mode: service:gluetun (using VPN)"
        
        # Get IP from aria2 container
        ARIA2_IP=$(docker compose exec -T aria2 wget -qO- https://ifconfig.me/ip 2>/dev/null | head -1)
        if [ -n "$ARIA2_IP" ]; then
            echo "   📍 aria2 Public IP: $ARIA2_IP"
            if [ "$ARIA2_IP" = "$VPN_IP" ]; then
                echo "   ✅ IP matches VPN - aria2 is using VPN!"
            else
                echo "   ⚠️  IP does not match VPN - aria2 may NOT be using VPN"
            fi
        fi
    else
        echo "   ❌ Network Mode: $ARIA2_NET (NOT using VPN!)"
    fi
else
    echo "   ❌ aria2 is NOT running"
fi

echo ""

# Check yt-dlp container (should use VPN)
echo "3️⃣ yt-dlp Container (YouTube Downloads):"
if docker compose ps yt-dlp | grep -q "Up"; then
    echo "   ✅ yt-dlp is running"
    
    # Check network mode - compare container IDs
    GLUETUN_ID=$(docker inspect drive-gluetun --format '{{.Id}}' 2>/dev/null)
    YTDLP_NET=$(docker inspect drive-ytdlp --format '{{.HostConfig.NetworkMode}}' 2>/dev/null)
    
    if echo "$YTDLP_NET" | grep -q "$GLUETUN_ID" || [ "$YTDLP_NET" = "container:drive-gluetun" ]; then
        echo "   ✅ Network Mode: service:gluetun (using VPN)"
        
        # Get IP from yt-dlp container
        YTDLP_IP=$(docker compose exec -T yt-dlp python3 -c "import urllib.request; print(urllib.request.urlopen('https://ifconfig.me/ip').read().decode())" 2>/dev/null)
        if [ -n "$YTDLP_IP" ]; then
            echo "   📍 yt-dlp Public IP: $YTDLP_IP"
            if [ "$YTDLP_IP" = "$VPN_IP" ]; then
                echo "   ✅ IP matches VPN - yt-dlp is using VPN!"
            else
                echo "   ⚠️  IP does not match VPN - yt-dlp may NOT be using VPN"
            fi
        fi
    else
        echo "   ❌ Network Mode: $YTDLP_NET (NOT using VPN!)"
    fi
else
    echo "   ❌ yt-dlp is NOT running"
fi

echo ""
echo "📊 Summary:"
echo "   If all IPs match and containers show 'service:gluetun', downloads are using VPN ✅"
echo "   If IPs differ or network mode is different, VPN is NOT being used ❌"

