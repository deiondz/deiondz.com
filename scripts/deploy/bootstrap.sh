#!/usr/bin/env bash
# Run as root with the receiver and dedicated PUBLIC key as arguments.
set -euo pipefail
test "$(id -u)" -eq 0
receiver=${1:?Receiver source path required}
public_key=${2:?Public key path required}
user=portfolio-deploy
base=/var/www/deiondz.com
test -s "$receiver"
test -s "$public_key"
ssh-keygen -l -f "$public_key" >/dev/null
test -L "$base/current"
test -d "$base/releases"

if ! id "$user" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "$user"
    # Impossible password hash, with public-key authentication permitted.
    usermod --password '*' "$user"
fi
install -d -m 0755 /usr/local/lib/deiondz-deploy
install -o root -g root -m 0755 "$receiver" /usr/local/lib/deiondz-deploy/receive.py
python3 -c 'import ast; ast.parse(open("/usr/local/lib/deiondz-deploy/receive.py").read())'
install -d -o "$user" -g "$user" -m 0700 "/home/$user/.ssh"
printf 'restrict,command="/usr/local/lib/deiondz-deploy/receive.py" %s\n' \
    "$(cat "$public_key")" > "/home/$user/.ssh/authorized_keys"
chown "$user:$user" "/home/$user/.ssh/authorized_keys"
chmod 0600 "/home/$user/.ssh/authorized_keys"
chown "$user:$user" "$base" "$base/releases"
touch "$base/.deploy.lock"
chown "$user:$user" "$base/.deploy.lock"

cat > /etc/ssh/sshd_config.d/90-portfolio-deploy.conf <<'CONFIG'
Match User portfolio-deploy
    AuthenticationMethods publickey
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AllowTcpForwarding no
    AllowAgentForwarding no
    X11Forwarding no
    PermitTTY no
    ForceCommand /usr/local/lib/deiondz-deploy/receive.py
Match all
CONFIG
sshd -t
systemctl reload ssh
echo 'Portfolio receiver and restricted deployment account installed.'
