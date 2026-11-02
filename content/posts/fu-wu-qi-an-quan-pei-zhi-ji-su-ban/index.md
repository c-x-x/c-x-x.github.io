+++
title = "服务器安全配置极速版"
slug = "fu-wu-qi-an-quan-pei-zhi-ji-su-ban"
date = "2026-11-02T15:33:46+08:00"
draft = false
categories = ["VPS"]
tags = ["安全"]
image = "/posts/fu-wu-qi-an-quan-pei-zhi-ji-su-ban/images/cover.webp"
description = "服务器基础安全配置看不进去？来看看这篇"
featured = true
toc = true
+++
适用：新装 Debian 12/13、root 登录、SSH 端口 22。已有业务的服务器不要直接照抄防火墙配置。

把下文 `203.0.113.10` 换成服务器 IP，`myadmin` 换成自己的管理用户名。**全程保留原 SSH 窗口，确认新连接成功后再关闭。**

## 1. 本机：生成密钥并上传公钥

在 Mac 终端或 Windows PowerShell 执行：

```bash
ssh-keygen -t ed25519 -a 64
```

保存位置按回车使用默认值，按提示设置密钥保护密码。**提示文件已存在时不要覆盖**；已有可用密钥可跳过生成。

上传公钥，再登录服务器：

```bash
scp "$HOME/.ssh/id_ed25519.pub" root@203.0.113.10:client-login.pub
ssh root@203.0.113.10
```

私钥 `id_ed25519` 留在本机，不要上传。

## 2. 服务器：更新系统、创建管理账号

下面在服务器的 root 窗口逐步执行：

```bash
apt update && apt upgrade -y
apt install -y sudo ufw fail2ban unattended-upgrades
adduser myadmin
usermod -aG sudo myadmin
```

`adduser` 按提示设置用户密码，其余信息可以回车跳过。这个密码用于后续 `sudo`。

为新账号安装公钥：

```bash
ssh-keygen -l -f /root/client-login.pub
install -d -m 700 -o myadmin -g "$(id -gn myadmin)" /home/myadmin/.ssh
install -m 600 -o myadmin -g "$(id -gn myadmin)" /root/client-login.pub /home/myadmin/.ssh/authorized_keys
```

**本机另开一个窗口**，验证新账号密钥登录：

```bash
ssh -o ControlPath=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -i "$HOME/.ssh/id_ed25519" myadmin@203.0.113.10
```

登录后执行：

```bash
sudo whoami
```

应输出 `root`。失败就停在这里，先解决登录问题。

## 3. 服务器：关闭 root 和密码登录

回到保留的 root 窗口。先备份，再修改：

```bash
task_ssh_backup=$(mktemp /root/sshd_config.before.XXXXXX)
cp -p /etc/ssh/sshd_config "$task_ssh_backup"
{
  printf '%s\n' 'PermitRootLogin no' 'PubkeyAuthentication yes' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no'
  cat "$task_ssh_backup"
} > /etc/ssh/sshd_config
/usr/sbin/sshd -t && systemctl reload ssh
```

从本机再次新建 `myadmin` 的密钥连接，确认登录和 `sudo whoami` 正常。失败时，在原 root 窗口恢复：

```bash
cp -p "$task_ssh_backup" /etc/ssh/sshd_config
/usr/sbin/sshd -t && systemctl reload ssh
```

## 4. 服务器：开启防火墙

仍在 root 窗口执行。下面只放行 SSH；网站、节点等业务端口部署时再添加。

```bash
sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
systemd-run --unit=ufw-safety-rollback --on-active=10m /usr/sbin/ufw disable
```

确认上一条成功创建回滚任务，再执行：

```bash
ufw enable
ufw status verbose
```

**10 分钟内从本机新建 SSH 连接**，成功后在新连接执行，取消自动回滚：

```bash
sudo systemctl stop ufw-safety-rollback.timer
sudo ufw status verbose
```

应显示 `Status: active`。连接失败时保留原窗口，等 10 分钟自动关闭 UFW 后排查。

## 5. 服务器：开启防爆破和自动更新

回到 root 窗口执行：

```bash
printf '[sshd]\nenabled = true\nbackend = systemd\n' > /etc/fail2ban/jail.d/sshd.local
systemctl enable --now fail2ban
systemctl restart fail2ban
dpkg-reconfigure -plow unattended-upgrades
```

自动更新选择 **Yes／是**。禁止自动重启，并启用更新定时器：

```bash
printf 'Unattended-Upgrade::Automatic-Reboot "false";\n' > /etc/apt/apt.conf.d/99-local-no-auto-reboot
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
```

## 6. 最后检查

```bash
/usr/sbin/sshd -T | awk '/^(permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication) /'
ufw status verbose
fail2ban-client status sshd
apt-config dump | awk '/APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::Automatic-Reboot /'
systemctl list-timers --all --no-pager apt-daily.timer apt-daily-upgrade.timer
```

确认：

- SSH：公钥 `yes`，root、密码、键盘交互认证均为 `no`。
- UFW：`active`，22/TCP 同时有 IPv4、IPv6 放行规则。
- Fail2ban：能显示 `sshd` 状态。
- 自动更新：两个周期配置均为 `1`，自动重启为 `false`，两个定时器已排期。

以后用 `myadmin` 登录，需要管理权限时使用 `sudo`。业务端口按需放行，例如 `sudo ufw allow 443/tcp`；商家有安全组时也要对应放行。系统更新不负责更新通过脚本安装的面板或节点核心，内核更新后需自己安排重启。