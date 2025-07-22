@echo off
REM Fix sudoers permissions on Raspberry Pi

set PI_HOST=%1
if "%PI_HOST%"=="" set PI_HOST=192.168.10.3

set SSH_USER=%2
if "%SSH_USER%"=="" set SSH_USER=pi

echo 🔒 Fixing sudoers permissions on %SSH_USER%@%PI_HOST%...

echo 🗑️ Removing old sudoers file...
ssh %SSH_USER%@%PI_HOST% "sudo rm -f /etc/sudoers.d/dnsmasq-gui"

echo 📝 Creating new sudoers file...
ssh %SSH_USER%@%PI_HOST% "echo '# Allow dnsmasq-gui service user to manage dnsmasq service' | sudo tee /etc/sudoers.d/dnsmasq-gui"
ssh %SSH_USER%@%PI_HOST% "echo 'dnsmasq-gui ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart dnsmasq' | sudo tee -a /etc/sudoers.d/dnsmasq-gui"
ssh %SSH_USER%@%PI_HOST% "echo 'dnsmasq-gui ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload dnsmasq' | sudo tee -a /etc/sudoers.d/dnsmasq-gui"
ssh %SSH_USER%@%PI_HOST% "echo 'dnsmasq-gui ALL=(ALL) NOPASSWD: /usr/bin/systemctl status dnsmasq' | sudo tee -a /etc/sudoers.d/dnsmasq-gui"
ssh %SSH_USER%@%PI_HOST% "echo 'dnsmasq-gui ALL=(ALL) NOPASSWD: /bin/kill -HUP *' | sudo tee -a /etc/sudoers.d/dnsmasq-gui"

echo 🔐 Setting correct permissions...
ssh %SSH_USER%@%PI_HOST% "sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"

echo ✅ Testing sudoers syntax...
ssh %SSH_USER%@%PI_HOST% "sudo visudo -c"

echo ✅ Sudoers file fixed!
pause
