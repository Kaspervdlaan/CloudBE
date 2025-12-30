# aria2 Torrent Management Guide

This guide explains how to manage your torrent downloads using the aria2 CLI scripts.

## Quick Start

All scripts are located in the `scripts/` directory. Make sure you're in the project root (`~/Desktop/cloudBE`) when running them.

## 📥 Adding Torrents

### Add a magnet link
```bash
./scripts/add-torrent.sh "magnet:?xt=urn:btih:YOUR_HASH_HERE"
```

### Add with custom save path
```bash
./scripts/add-torrent.sh "magnet:?xt=urn:btih:YOUR_HASH_HERE" "/data/movies/specific-folder"
```

**Note:** By default, downloads go to `/data/movies` which maps to `/home/kasper/Videos` on your host machine (accessible by Plex).

---

## 📊 Checking Status

### View all downloads
```bash
./scripts/status-torrents.sh
```

This shows:
- **Active Downloads** - Currently downloading with progress and speed
- **Waiting Downloads** - Queued downloads
- **Stopped Downloads** - Completed or stopped downloads (last 5)

**Example output:**
```
=== Active Downloads ===

  📥 Fallout.2024.S02E01.1080p.HEVC.x265-MeGusta[EZTVx.to].mkv
     Progress: 29.6% (0.17 GB / 0.58 GB)
     Speed: 2.48 MB/s
     GID: 73b5a825f967c422

=== Waiting Downloads ===

No waiting downloads

=== Recent Stopped Downloads (last 5) ===

  ✓ Complete - [METADATA]Fallout+2024+S02E01+1080p+HEVC+x265-MeGusta
```

---

## ⏹️ Stopping Downloads

### Stop a specific download
```bash
./scripts/stop-torrent.sh <GID>
```

**Example:**
```bash
./scripts/stop-torrent.sh 73b5a825f967c422
```

**Note:** This pauses the download. The files remain in the download directory. To remove it completely, use the remove script (see below).

### Stop ALL active downloads
```bash
./scripts/stop-torrent.sh --all
```

This will:
1. Pause all active downloads
2. Remove them from the download queue

---

## 🗑️ Removing Downloads

### Remove a download completely
```bash
./scripts/remove-torrent.sh <GID>
```

**Example:**
```bash
./scripts/remove-torrent.sh 73b5a825f967c422
```

**Important:** This removes the download from aria2's queue, but **does NOT delete the files** from disk. Files already downloaded will remain in `/home/kasper/Videos`.

To delete files from disk, manually remove them:
```bash
rm -rf /home/kasper/Videos/filename
```

---

## 🔄 Resuming Downloads

If you paused a download and want to resume it, you can use the aria2 RPC API directly:

```bash
export ARIA2_RPC_SECRET=$(grep ARIA2_RPC_SECRET .env | cut -d'=' -f2)
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"aria2.unpause\",\"id\":\"resume\",\"params\":[\"token:${ARIA2_RPC_SECRET}\",\"<GID>\"]}"
```

Replace `<GID>` with the actual GID from the status output.

---

## 📁 Download Location

All downloads are saved to:
- **In container:** `/data/movies`
- **On host:** `/home/kasper/Videos`

This directory is mounted to your Plex Media Server, so completed downloads will automatically appear in Plex.

---

## 🔐 Security Notes

- All downloads go through **NordVPN** automatically
- Traffic is routed through the VPN container (gluetun)
- Your real IP address is hidden while downloading

---

## 🔧 Advanced: Direct RPC Calls

For advanced operations, you can call the aria2 RPC API directly:

### Get version info
```bash
export ARIA2_RPC_SECRET=$(grep ARIA2_RPC_SECRET .env | cut -d'=' -f2)
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"aria2.getVersion\",\"id\":\"test\",\"params\":[\"token:${ARIA2_RPC_SECRET}\"]}" \
  | python3 -m json.tool
```

### Get active downloads (detailed)
```bash
export ARIA2_RPC_SECRET=$(grep ARIA2_RPC_SECRET .env | cut -d'=' -f2)
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"aria2.tellActive\",\"id\":\"active\",\"params\":[\"token:${ARIA2_RPC_SECRET}\"]}" \
  | python3 -m json.tool
```

### Get global statistics
```bash
export ARIA2_RPC_SECRET=$(grep ARIA2_RPC_SECRET .env | cut -d'=' -f2)
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"aria2.getGlobalStat\",\"id\":\"stats\",\"params\":[\"token:${ARIA2_RPC_SECRET}\"]}" \
  | python3 -m json.tool
```

---

## 📝 Common Workflows

### Download a single movie/show
```bash
# 1. Add torrent
./scripts/add-torrent.sh "magnet:?xt=urn:btih:..."

# 2. Check status
./scripts/status-torrents.sh

# 3. Once complete, it's automatically available in Plex at /home/kasper/Videos
```

### Queue multiple downloads
```bash
# Add multiple downloads (they'll queue automatically)
./scripts/add-torrent.sh "magnet:?xt=urn:btih:FIRST_HASH"
./scripts/add-torrent.sh "magnet:?xt=urn:btih:SECOND_HASH"
./scripts/add-torrent.sh "magnet:?xt=urn:btih:THIRD_HASH"

# Check status to see which are active/waiting
./scripts/status-torrents.sh
```

### Stop and remove a stuck download
```bash
# 1. Get the GID from status
./scripts/status-torrents.sh

# 2. Stop it
./scripts/stop-torrent.sh <GID>

# 3. Remove it
./scripts/remove-torrent.sh <GID>

# 4. If needed, manually delete incomplete files
ls /home/kasper/Videos/
rm -rf /home/kasper/Videos/incomplete-folder-name
```

---

## 🐛 Troubleshooting

### VPN not connected
```bash
docker compose logs gluetun --tail 50
```
Look for "VPN connection successful" or errors.

### aria2 not responding
```bash
docker compose ps aria2
docker compose logs aria2 --tail 50
```

### Can't connect to RPC
Make sure:
1. aria2 container is running: `docker compose ps aria2`
2. gluetun is healthy: `docker compose ps gluetun`
3. Port 6800 is accessible: `curl http://localhost:6800/jsonrpc`

### Downloads not appearing in Plex
1. Check download location: `ls -la /home/kasper/Videos/`
2. Refresh Plex library in the web UI
3. Make sure Plex has permission to read the directory

---

## 📚 Additional Resources

- [aria2 RPC Documentation](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface)
- [aria2 Configuration](https://aria2.github.io/manual/en/html/aria2c.html#options)

---

## Scripts Summary

| Script | Purpose | Usage |
|--------|---------|-------|
| `add-torrent.sh` | Add a magnet link | `./scripts/add-torrent.sh <magnet-link> [save-path]` |
| `status-torrents.sh` | Check download status | `./scripts/status-torrents.sh` |
| `stop-torrent.sh` | Stop/pause downloads | `./scripts/stop-torrent.sh <GID>` or `./scripts/stop-torrent.sh --all` |
| `remove-torrent.sh` | Remove from queue | `./scripts/remove-torrent.sh <GID>` |

