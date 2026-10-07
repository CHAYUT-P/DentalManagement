#!/usr/bin/env bash
# One command from this Mac to a VPS:   pnpm deploy:vps root@<server-ip>
# First time it installs everything; after that the same command updates the
# server with the code on this Mac. Settings come from deploy/.env.production.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${1:-}"
ENVFILE=deploy/.env.production
if [ -z "$HOST" ]; then
  echo "ใช้แบบนี้:  pnpm deploy:vps root@<IP ของเซิร์ฟเวอร์>"; exit 1
fi
if [ ! -f "$ENVFILE" ]; then
  cp deploy/env.production.example "$ENVFILE"
  echo "สร้างไฟล์ $ENVFILE ให้แล้ว — เปิดไฟล์ กรอกค่าให้ครบ แล้วรันคำสั่งเดิมอีกครั้ง"; exit 1
fi
if grep -qE '^(POSTGRES_PASSWORD=change-me|STAFF_PIN=$|CRON_SECRET=change-me)' "$ENVFILE"; then
  echo "ยังกรอก $ENVFILE ไม่ครบ (POSTGRES_PASSWORD / STAFF_PIN / CRON_SECRET)"; exit 1
fi

# root (DigitalOcean) runs commands directly; other logins (Oracle's "ubuntu")
# use sudo, and own the app folder so the code can be copied in
SUDO=""
[ "${HOST%@*}" = "root" ] || SUDO="sudo"

echo "▸ เชื่อมต่อ $HOST …"
ssh -o ConnectTimeout=10 "$HOST" "$SUDO mkdir -p /opt/dentakids && $SUDO chown \$(id -u):\$(id -g) /opt/dentakids && (command -v rsync >/dev/null || ($SUDO apt-get update -qq && $SUDO apt-get install -y -qq rsync))"

echo "▸ ส่งโค้ดขึ้นเซิร์ฟเวอร์ …"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .claude \
  --exclude apps/staff-desktop/src-tauri/target --exclude apps/staff-desktop/dist \
  --exclude backup --exclude '.env*' --exclude 'deploy/.env.production' \
  --exclude .db-copied --exclude backups \
  ./ "$HOST":/opt/dentakids/
scp -q "$ENVFILE" "$HOST":/opt/dentakids/.env.production
ssh "$HOST" 'chmod 600 /opt/dentakids/.env.production'

echo "▸ ติดตั้ง / อัปเดตบนเซิร์ฟเวอร์ …"
ssh "$HOST" "$SUDO bash /opt/dentakids/deploy/server-setup.sh"
