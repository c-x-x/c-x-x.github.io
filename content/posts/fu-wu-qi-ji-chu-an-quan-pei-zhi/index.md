+++
title = "服务器基础安全配置"
slug = "fu-wu-qi-ji-chu-an-quan-pei-zhi"
date = "2026-10-21T15:58:56+08:00"
draft = false
categories = ["vps"]
tags = ["安全"]
image = "/posts/fu-wu-qi-ji-chu-an-quan-pei-zhi/images/cover.webp"
description = "新买的 VPS 能通过 SSH 登录，并不代表基础安全已经配置完毕，如何进行安全配置呢？"
featured = true
toc = true
+++
## 前言

新买的 VPS 能通过 SSH 登录，并不代表基础安全已经配置完毕。本文以 **Debian 13** 为例，从本机生成 SSH 密钥开始，完成普通管理账号、SSH 登录限制、防火墙和自动安全更新的配置。

本机可以使用 **macOS 或 Windows**，SSH 客户端不限品牌。文中的命令行示例使用标准 OpenSSH；使用图形客户端时，按对应字段填写即可。

本文适合刚安装系统、尚未部署业务的新服务器。已经运行网站、容器、VPN 或其他服务的机器，需要先核对现有账号、端口和防火墙规则，再决定如何合并配置。

## 一、先看懂操作位置和自定义参数

### 1. 哪些命令在本机执行，哪些在服务器执行

本文使用三种标记：

| 标记 | 执行位置 | 使用的环境 |
| --- | --- | --- |
| **本机 · macOS** | 自己的 Mac | 终端中的 Bash 或 Zsh |
| **本机 · Windows** | 自己的 Windows 电脑 | PowerShell，已安装 OpenSSH 客户端 |
| **服务器** | 已连接 VPS 的 SSH 窗口 | Debian 的 Bash |

Mac 和 Windows 的本机步骤是两条分支，选择自己正在使用的一条。服务器步骤相同。

建议保留一个窗口用于本机命令，另一个窗口用于连接服务器。执行 `ssh` 后，这个窗口就进入了服务器；不要在里面误执行标记为“本机”的命令。新开本机终端时，也要重新设置该终端需要使用的连接和密钥变量。

**不要把整篇文章一次性粘贴执行。** 尤其是安装软件、创建用户、输入密码等交互步骤，应逐步执行，核对输出后再继续。遇到报错，先解决当前问题。

### 2. 可以自定义的内容

| 参数或项目 | 本文示例 | 自定义说明 |
| --- | --- | --- |
| 服务器地址 | `203.0.113.10` | 替换为自己的公网 IP 或域名。这是文档示例地址，不能直接用于连接 |
| 初始登录用户 | `root` | 如果商家提供的是可使用 sudo 的普通账号，填写那个账号 |
| 新管理用户名 | `myadmin` | 可以自定义，例如 `imx`、`opsuser`。建议以小写英文字母开头，使用字母、数字、下划线或连字符；不要用 `root` 或已有系统账号 |
| 当前 SSH 端口 | `22` | 必须填写服务器**实际正在监听**的端口；设置变量不会修改服务器的 SSH 监听端口 |
| 本机私钥文件名 | `vps_ed25519` | 可以改名，也可以使用 `.pem` 后缀；后缀不决定文件内容格式 |
| 密钥备注 | `my-laptop` | 可以自定义，用来区分设备或用途；建议使用简短英文，不要填写密码 |
| 密钥类型 | `ed25519` | 由 `-t` 指定，适用于本文环境；其他类型需要同时核对客户端和服务器兼容性，不靠修改文件后缀转换 |
| 私钥密码派生轮数 | `64` | 由 `-a` 指定，可调整；使用 Passphrase 时影响私钥保护的派生开销，数值越大，解锁通常越慢 |
| 上传到服务器的公钥文件名 | `client-login.pub` | 可以改名，但本机上传和服务器读取时必须一致 |
| 密钥保护密码 | 创建密钥时输入 | 自行设置，用于保护本机私钥 |
| 新用户密码 | 创建账号时输入 | 自行设置，后续 sudo 提权时使用 |
| 自动回滚等待时间 | `10m` | 可以改成 `15m` 等，给自己留出重新连接和验证的时间 |
| 回滚任务名称 | `ufw-safety-rollback`、`ssh-safety-rollback` | 可以改名，但创建、检查和停止任务时必须使用同一个名称 |
| 业务端口与协议 | 按实际服务填写 | 部署服务后再放行，注意区分 TCP 和 UDP |

`/etc/ssh/sshd_config`、`authorized_keys` 等是本教程使用的标准配置路径或文件名，不是随意替换的占位符。如果镜像修改了默认路径，应先核对实际配置。

本机和服务器的变量互不共享。**新开终端、切换用户或执行 `sudo -i` 后，需要重新设置后续步骤依赖的变量。**

### 3. 先保留恢复途径

修改前确认商家是否提供网页控制台、VNC、救援模式或密码重置等恢复方式。没有控制台时，更要保留当前有效的 SSH 窗口，并按本文设置临时回滚任务。

验证登录是否正常，要建立一条**新的 SSH 连接**，不能只看旧窗口是否还能输入命令。旧会话可以在新登录被禁止后继续保持连接。

本文的定时回滚任务只存在于当前启动周期，**配置和验证期间不要重启服务器**。它只能撤销本文指定的服务器内改动，不能撤销商家安全组的修改，也不能修复服务器本身无法启动等故障。

## 二、理解公钥、私钥和两种密码

SSH 密钥通常成对生成：

| 内容 | 放在哪里 | 用途 |
| --- | --- | --- |
| 私钥 | 自己的电脑或客户端密钥库 | 登录时证明身份，需要妥善保护 |
| 公钥 | 服务器目标用户的 `authorized_keys` | 授权对应私钥登录，可以公开 |
| 私钥保护密码，即 Passphrase | 自己记住或存入密码管理器 | 解锁本机私钥，不是服务器登录密码 |
| 服务器用户密码 | 服务器账号对应的密码 | 本文后续主要用于 sudo 提权 |

本文采用**在本机生成密钥，只把公钥上传服务器**的方式。私钥不需要上传到商家后台或服务器。

首次连接服务器时，客户端还会提示确认**服务器主机指纹**。它用于识别服务器，与个人登录公钥的指纹是两回事。应通过商家提供的信息或其他可信途径核对；遇到主机指纹变化提示，先确认是否重装过系统或连接到了错误地址。

## 三、在本机生成并保存 SSH 密钥

### 1. 本机 · macOS

设置自己的参数：

```bash
SERVER_HOST='203.0.113.10'
INITIAL_USER='root'
SSH_PORT=22
KEY_FILE="$HOME/.ssh/vps_ed25519"
KEY_COMMENT='my-laptop'
```

创建存放密钥的目录：

```bash
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
```

先检查文件名是否已被使用：

```bash
ls -l "$KEY_FILE" "${KEY_FILE}.pub"
```

如果提示两个文件不存在，可以继续。如果已经存在，先确认是否是已有密钥；需要新建时应换一个文件名，**不要覆盖旧私钥**。

生成 Ed25519 密钥：

```bash
ssh-keygen -t ed25519 -a 64 -f "$KEY_FILE" -C "$KEY_COMMENT"
```

按提示输入并确认 Passphrase，建议设置。输入时不会显示字符，这是正常现象。如果出现是否覆盖文件的提示，输入 `n`，先检查文件名。

生成后会得到：

```text
~/.ssh/vps_ed25519       私钥
~/.ssh/vps_ed25519.pub   公钥
```

设置私钥权限：

```bash
chmod 600 "$KEY_FILE"
```

验证私钥能否解析，不显示其内容：

```bash
ssh-keygen -y -f "$KEY_FILE" >/dev/null
```

如果私钥设置了保护密码，这里会要求输入。没有报错并返回命令提示符，表示文件可以解析，尚不代表服务器登录已经验证。

### 2. 本机 · Windows

在 PowerShell 中先检查 OpenSSH 客户端是否可用：

```powershell
ssh -V
Get-Command ssh-keygen, scp
```

如果命令不存在，通过 Windows 的“可选功能”安装 **OpenSSH 客户端**。这里只需要客户端，不需要在本机启用 SSH 服务器。

设置自己的参数：

```powershell
$ServerHost = '203.0.113.10'
$InitialUser = 'root'
$SshPort = 22
$KeyFile = Join-Path $env:USERPROFILE '.ssh\vps_ed25519'
$KeyComment = 'my-laptop'
```

创建目录并检查文件名：

```powershell
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $KeyFile) | Out-Null
Test-Path -LiteralPath $KeyFile
Test-Path -LiteralPath "${KeyFile}.pub"
```

两个结果应为 `False`。如果任一结果为 `True`，先确认已有文件，或修改 `$KeyFile` 使用新文件名，不要直接覆盖。

生成密钥：

```powershell
ssh-keygen -t ed25519 -a 64 -f $KeyFile -C $KeyComment
```

按提示设置并确认 Passphrase。生成的私钥和 `.pub` 公钥位于当前用户的 `.ssh` 文件夹。

验证私钥能否解析：

```powershell
ssh-keygen -y -f $KeyFile > $null
if ($LASTEXITCODE -ne 0) { throw '私钥解析失败，请先解决格式、权限或保护密码问题。' }
```

Windows 使用文件 ACL 管理访问权限，不能照搬 macOS 的 `chmod 600`。OpenSSH 新生成的私钥通常已具有合适权限；如果复制文件后出现权限过宽的告警，按文末的 Windows 权限修复步骤处理。

### 3. 私钥如何保存和备份

私钥直接由 `ssh-keygen` 写入文件，不需要先复制成字符串，再通过文本编辑器保存。

文件名是否带 `.pem` 不影响密钥本身。把富文本、Word 文档或其他格式改成 `.pem` 后缀，并不会将它转换为私钥文件。

私钥应保存在自己控制的设备上，并保留加密备份。可以使用支持加密附件的密码管理器，或其他可信的加密备份方式。不要把私钥提交到博客、公开仓库或截图中。

## 四、上传公钥，验证密钥登录

这一阶段保留服务器原有的有效登录方式，**先验证密钥，再关闭密码认证**。

### 1. 将公钥上传到初始账号的家目录

本机 · macOS：

```bash
scp -P "$SSH_PORT" "${KEY_FILE}.pub" "${INITIAL_USER}@${SERVER_HOST}:~/client-login.pub"
```

本机 · Windows：

```powershell
scp -P $SshPort "${KeyFile}.pub" "${InitialUser}@${ServerHost}:~/client-login.pub"
```

需要原账号密码时，输入服务器初始账号的密码。`scp` 指定端口使用大写 `-P`，`ssh` 指定端口使用小写 `-p`。

如果商家提供的初始账号已经只允许使用另一把密钥登录，应为本节的 `scp` 和初始 `ssh` 命令补上 `-i`，指定那把已有私钥，或使用已经配置好的客户端连接。本机新生成的公钥尚未安装前，不能用它取代原有登录凭据。

使用图形客户端也可以完成这一步：通过 SFTP 上传**公钥文件**到初始账号家目录，文件名使用 `client-login.pub`，或自己选定的名称。

### 2. 用初始账号登录服务器

本机 · macOS：

```bash
ssh -p "$SSH_PORT" "${INITIAL_USER}@${SERVER_HOST}"
```

本机 · Windows：

```powershell
ssh -p $SshPort "${InitialUser}@${ServerHost}"
```

按原有有效方式完成登录，保留这个会话。此时还没有关闭密码认证，也没有禁止 root 登录。

### 3. 在服务器初始账号中安装公钥

**服务器 · 当前初始登录账号。此处尚未切换到其他用户。**

```bash
PUB_FILE="$HOME/client-login.pub"
ssh-keygen -l -f "$PUB_FILE"
```

应能输出公钥的指纹信息。如果无法解析，先检查是否上传了正确的 `.pub` 文件。

按顺序执行：

```bash
install -d -m 700 "$HOME/.ssh"
touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
printf '\n' >> "$HOME/.ssh/authorized_keys"
cat "$PUB_FILE" >> "$HOME/.ssh/authorized_keys"
```

这里采用追加方式，保留原有授权。空行用于避免已有文件末尾缺少换行时，两把公钥粘在同一行。这一组不必反复运行，以免重复添加同一把公钥。

标准配置使用用户家目录下的 `.ssh/authorized_keys`。如果商家镜像修改了 `AuthorizedKeysFile`，或使用其他公钥授权机制，需要按实际路径配置，不能仅凭文件名判断。

### 4. 建立新的密钥连接

本机 · macOS：

```bash
ssh -o ControlPath=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -i "$KEY_FILE" -p "$SSH_PORT" "${INITIAL_USER}@${SERVER_HOST}"
```

本机 · Windows：

```powershell
ssh -o ControlPath=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -i $KeyFile -p $SshPort "${InitialUser}@${ServerHost}"
```

这些选项用于测试指定密钥，并避免复用已有的 SSH 控制连接或回退到服务器密码认证。私钥设置了 Passphrase 时，输入的是**私钥保护密码**。

使用图形客户端时，新建或复制一个连接配置，填写：

| 客户端字段 | 填写内容 |
| --- | --- |
| 地址 | 自己的服务器公网 IP 或域名 |
| 端口 | 当前实际 SSH 端口 |
| 用户名 | 当前初始登录账号 |
| 认证方式 | 密钥或公钥认证 |
| 私钥 | 本机生成的私钥文件，或导入后的密钥条目 |
| Passphrase | 创建密钥时设置的保护密码；未设置则留空 |

具体字段名称因客户端而异。需要导入的是**私钥**，不是 `.pub` 公钥。验证时只启用密钥认证，避免密码回退掩盖密钥配置错误。

登录成功后执行 `whoami`，确认是预期账号。保留原有 SSH 窗口，继续后面的服务器步骤。

## 五、更新系统并开启自动安全更新

### 1. 进入服务器管理环境

接下来的服务器配置步骤在 **root 的 Bash 环境**中执行。

如果初始账号就是 root，可以直接继续。如果是具有 sudo 权限的普通账号，先单独执行：

```bash
sudo -i
```

确认提示符已经进入 root 环境，再执行后续命令。不要把 `sudo -i` 和后面的配置命令当成一个代码块一次粘贴。

重新设置服务器端参数，和自己的实际情况保持一致：

```bash
INITIAL_USER='root'
ADMIN_USER='myadmin'
SSH_PORT=22
PUB_UPLOAD_NAME='client-login.pub'
ROLLBACK_DELAY='10m'
```

如果最初登录的是其他账号，`INITIAL_USER` 填那个账号；`ADMIN_USER` 填自己准备创建的新管理用户名；`SSH_PORT` 填当前实际监听端口。

### 2. 更新系统

```bash
apt update && apt upgrade
```

按提示确认更新。如果出现 `/etc/ssh/sshd_config` 的配置文件更新询问，先选择保留当前本地版本，再单独审查差异，避免覆盖镜像中已有的登录配置。

出现软件包锁占用时，应等待正在进行的 APT 任务结束，不要通过删除锁文件或强行终止进程解决。

### 3. 安装 sudo 和自动更新组件

```bash
apt install sudo unattended-upgrades
```

安装完成后，再执行：

```bash
dpkg-reconfigure -plow unattended-upgrades
```

询问是否自动下载、安装更新时选择 **Yes／是**。沿用 Debian 默认允许的更新来源；默认规则通常包含当前发行版和安全更新来源，并非只安装名称中带有“安全”的更新。[默认来源配置](https://sources.debian.org/src/unattended-upgrades/2.12/data/50unattended-upgrades.Debian/)

如果不希望无人值守更新自动重启服务器，可以明确设置：

```bash
cat > /etc/apt/apt.conf.d/99-local-no-auto-reboot <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
EOF
```

这是本文新增的本地配置文件；如果已有同名文件，应先备份并合并内容。关闭自动重启后，内核等更新可能需要自己安排维护时间重启，才能完整生效。

启用定时器：

```bash
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
```

### 4. 核对配置和执行情况

```bash
apt-config dump | awk '/APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::Automatic-Reboot /'
```

应包含：

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
Unattended-Upgrade::Automatic-Reboot "false";
```

查看定时任务，不使用分页器：

```bash
systemctl list-timers --all --no-pager apt-daily.timer apt-daily-upgrade.timer
```

需要时可以进行一次模拟检查，不实际安装更新：

```bash
unattended-upgrade --dry-run --debug
```

检查允许来源中是否包含本发行版的安全更新来源，有没有解析、软件源或权限错误。真实执行记录可以通过下面的命令查看：

```bash
journalctl -u apt-daily-upgrade.service -n 50 --no-pager
tail -n 50 /var/log/unattended-upgrades/unattended-upgrades.log
```

刚安装且尚未执行过时，日志可能还不存在。**配置已开启、定时器已排期，不等于已经成功安装过更新。** 通过脚本或独立二进制部署的软件，也需要按照各自的更新方式维护。[Debian 安全说明](https://www.debian.org/security/)、[unattended-upgrade 手册](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html)

## 六、创建自定义管理账号

**服务器 · 继续在前面的 root Bash 会话操作。** 如果新开了会话，先重新设置 `INITIAL_USER`、`ADMIN_USER`、`PUB_UPLOAD_NAME` 等变量。

### 1. 确认用户名未被占用

```bash
getent passwd "$ADMIN_USER"
```

新用户名没有被占用时，这条命令没有输出。如果有输出，先确认已有账号用途，或换一个名字。下面的公钥安装命令针对**本节新创建的用户**，不要直接用于覆盖已有用户的授权文件。

### 2. 创建账号并加入 sudo 组

```bash
adduser "$ADMIN_USER"
```

按提示设置并确认用户密码，姓名、房间等信息可回车跳过，最后确认保存。这个密码后续用于 sudo，不是私钥的 Passphrase。

创建成功后执行：

```bash
usermod -aG sudo "$ADMIN_USER"
```

### 3. 为新账号安装本机生成的公钥

根据系统账号记录获取家目录和主组，不把 `/home/某个用户名` 写死：

```bash
INITIAL_HOME=$(getent passwd "$INITIAL_USER" | cut -d: -f6)
ADMIN_HOME=$(getent passwd "$ADMIN_USER" | cut -d: -f6)
ADMIN_GROUP=$(id -gn "$ADMIN_USER")
PUB_FILE="${INITIAL_HOME}/${PUB_UPLOAD_NAME}"
```

先确认公钥文件存在并可以解析：

```bash
ssh-keygen -l -f "$PUB_FILE"
```

如果报错，先检查初始用户和上传路径，不要继续安装。确认无误后执行：

```bash
install -d -m 700 -o "$ADMIN_USER" -g "$ADMIN_GROUP" "$ADMIN_HOME/.ssh"
install -m 600 -o "$ADMIN_USER" -g "$ADMIN_GROUP" "$PUB_FILE" "$ADMIN_HOME/.ssh/authorized_keys"
```

这里安装的是本次上传的**公钥**，不是把本机私钥复制到服务器。

### 4. 新开管理账号连接并验证 sudo

本机 · macOS：

```bash
ADMIN_USER='myadmin'
ssh -o ControlPath=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -i "$KEY_FILE" -p "$SSH_PORT" "${ADMIN_USER}@${SERVER_HOST}"
```

本机 · Windows：

```powershell
$AdminUser = 'myadmin'
ssh -o ControlPath=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -i $KeyFile -p $SshPort "${AdminUser}@${ServerHost}"
```

使用图形客户端时，复制原连接配置，将登录用户名改成新管理用户名，地址、端口和私钥保持一致，并重新建立连接。

在**新管理账号会话**中分别执行：

```bash
whoami
```

应输出自己设置的新用户名。再执行：

```bash
sudo whoami
```

如果要求密码，输入刚创建的新用户密码，应输出 `root`。

只有新账号的密钥登录和 sudo 均已验证，才能继续关闭 root 直接登录。保留这个有效的新用户会话，也保留前面的服务器管理会话。

## 七、配置双栈防火墙，并验证新连接

**服务器 · 切回前面的 root Bash 会话。** 后面的 `SSH_PORT` 必须是当前实际 SSH 端口，`ROLLBACK_DELAY` 是自己设置的回滚等待时间。

### 1. 核对端口和现有规则

```bash
ss -lntup
/usr/sbin/sshd -T | awk '/^(port|listenaddress|authorizedkeysfile|pubkeyauthentication) /'
```

确认自己的 SSH 端口；同时记录已经需要对外提供服务的其他端口。监听在 `127.0.0.1` 上的本地服务与监听在所有地址上的服务含义不同，不能只看到端口数字就全部放行。

安装 UFW 和用于检查完整 nftables 规则的命令行工具：

```bash
apt install ufw nftables
```

Debian 13 官方 nftables 软件包首次安装时不默认启用或启动 `nftables.service`。这里安装它用于检查规则，后续由 UFW 管理防火墙，不另外启动一套 nftables 配置服务。[打包配置](https://sources.debian.org/src/nftables/1.1.3-1/debian/rules/)

安装后检查：

```bash
ufw status verbose
nft list ruleset
iptables-save
ip6tables-save
systemctl is-active nftables firewalld
```

本文接下来的启用步骤以 **UFW 为 inactive、没有需要保留的已有规则、没有另一套防火墙管理服务正在运行**为前提。`nft` 能检查原生 nftables 规则；`iptables-save` 和 `ip6tables-save` 分别检查兼容层的 IPv4、IPv6 规则。

如果看到现有规则或正在使用其他防火墙管理器，先确认其用途，不要执行清空规则、重置 UFW 或覆盖现有策略的命令。容器、VPN 和商家镜像可能维护自己的规则。

### 2. 配置规则，先放行现有 SSH 端口

满足上述前提后执行：

```bash
sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp"
```

确认 IPv6 配置：

```bash
awk '/^IPV6=/' /etc/default/ufw
```

应显示 `IPV6=yes`。如果不是，先检查配置，不要跳过 IPv6 的过滤。

新服务器尚无业务时，业务入站端口先显式放行 SSH 即可。如果已经运行其他必要服务，应在启用前补上它们的端口和协议。

UFW 会保留回环、已建立连接和部分网络必需报文等基础规则。因此“默认拒绝入站”并不等于禁止所有 ICMP 或所有非 SSH 数据包。[UFW 手册](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)

### 3. 创建临时回滚任务

```bash
systemd-run --unit=ufw-safety-rollback --on-active="$ROLLBACK_DELAY" /usr/sbin/ufw disable
```

确认任务已经启动：

```bash
systemctl is-active ufw-safety-rollback.timer
systemctl list-timers --all --no-pager ufw-safety-rollback.timer
```

第一条应输出 `active`，第二条应显示下一次执行时间。创建任务如果报错，先停止，不要启用防火墙。不要把同名旧任务仍在运行误当成这次创建成功。

这个回滚任务会在等待时间到达后关闭 UFW，适用于本节原先 UFW 未启用的场景。它不会恢复商家安全组，也不是已有复杂防火墙策略的通用备份工具。

### 4. 启用防火墙

```bash
ufw enable
```

由于已经放行实际 SSH 端口，并确认回滚任务有效，出现远程连接警告时可以输入 `y`。查看结果：

```bash
ufw status verbose
```

如果 SSH 使用 `22` 端口，应能看到类似结果：

```text
Status: active
Default: deny (incoming), allow (outgoing), ...

22/tcp        ALLOW IN    Anywhere
22/tcp (v6)   ALLOW IN    Anywhere (v6)
```

使用其他 SSH 端口时，数字应对应自己的实际端口。

### 5. 新开连接，成功后取消回滚

从本机重新建立一条**新管理账号的 SSH 连接**，确认能登录并执行 `sudo whoami`，输出 `root`。

在这个**新管理账号会话**中执行：

```bash
sudo systemctl stop ufw-safety-rollback.timer
sudo ufw status verbose
```

最后仍应显示 `Status: active`。如果已经显示 `inactive`，可能是回滚任务已执行，需要重新安排回滚、启用并重新验证，不能把连接恢复当作防火墙启用成功。

如果新连接失败，不取消回滚；从任务创建时计算，等待设定时间到达后重试。不要关闭仍有效的旧窗口，也不要在等待期间重启服务器。

## 八、关闭 root 直接登录和 SSH 密码认证

前提是新管理账号已经能通过密钥建立新连接，并通过 sudo 提权。**本节修改只在验证这些前提之后执行。**

服务器使用标准 `/etc/ssh/sshd_config` 和 `ssh.service` 时，可按下面的方式配置。如果服务通过 `-f` 使用其他配置文件、通过 `-o` 覆盖配置，或包含复杂的 `Match` 规则，应先核对实际生效范围。

### 1. 回到 root 管理会话，备份配置

可以切回保留的 root 管理窗口；也可以在新管理账号窗口中先单独执行 `sudo -i`。如果切换了环境，重新设置 `ROLLBACK_DELAY='10m'`，或自己选择的等待时间。

检查现有配置的语法：

```bash
/usr/sbin/sshd -t
```

没有报错后，生成独立备份：

```bash
SSH_BACKUP=$(mktemp /root/sshd_config.before-hardening.XXXXXX)
install -m 600 /etc/ssh/sshd_config "$SSH_BACKUP"
printf '本次配置备份：%s\n' "$SSH_BACKUP"
```

记录这次输出的备份路径。后续步骤继续在**同一个 root Bash 会话**执行，避免丢失 `$SSH_BACKUP` 变量。重复操作时应使用新的备份，不覆盖以前的备份。

### 2. 先安排 SSH 配置回滚

```bash
systemd-run \
  --unit=ssh-safety-rollback \
  --on-active="$ROLLBACK_DELAY" \
  --expand-environment=no \
  /bin/sh -c 'cp -p "$1" /etc/ssh/sshd_config && /usr/sbin/sshd -t && /usr/bin/systemctl reload ssh' \
  sh "$SSH_BACKUP"
```

该任务会恢复本次备份，检查语法后重新加载 SSH。`--expand-environment=no` 避免 systemd 提前展开交给 Shell 使用的参数。

检查任务：

```bash
systemctl is-active ssh-safety-rollback.timer
systemctl list-timers --all --no-pager ssh-safety-rollback.timer
```

必须确认本次创建成功、状态为 `active`，并有下一次执行时间，才继续。

### 3. 写入登录策略

标准 OpenSSH 的全局配置通常采用最先读到的值。单纯在文件末尾添加配置，或创建一个排序较后的片段文件，可能不能覆盖已有配置。因此这里在主配置开头写入策略，并保留备份中的其余内容。

```bash
{
  printf '%s\n' \
    'PermitRootLogin no' \
    'PubkeyAuthentication yes' \
    'PasswordAuthentication no' \
    'KbdInteractiveAuthentication no'
  cat "$SSH_BACKUP"
} > /etc/ssh/sshd_config
```

这一步关闭的是 SSH 的 root 直接登录和密码、键盘交互认证，不是删除 root 账号。管理账号仍然可以通过 sudo 获取 root 权限。[sshd\_config 手册](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)

### 4. 检查语法和生效值

```bash
/usr/sbin/sshd -t
```

应没有报错。然后执行：

```bash
/usr/sbin/sshd -T | awk '/^(permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication) /'
```

预期结果：

```text
permitrootlogin no
pubkeyauthentication yes
passwordauthentication no
kbdinteractiveauthentication no
```

**如果语法检查失败，或实际值不是预期结果，先停止，不要重新加载 SSH。** 可以在仍有效的管理会话中使用下面的命令恢复刚才的配置，再排查原因：

```bash
cp -p "$SSH_BACKUP" /etc/ssh/sshd_config
/usr/sbin/sshd -t
```

`sshd -T` 默认展示全局配置。存在 `Match User`、`Match Address` 等规则时，还应检查对应连接上下文。例如在带有 `$SSH_CONNECTION` 的原 SSH 登录 Shell 中，可模拟当前来源对 root 的连接配置：

```bash
read -r CHECK_CLIENT_IP CHECK_CLIENT_PORT CHECK_SERVER_IP CHECK_SERVER_PORT <<< "$SSH_CONNECTION"
sudo /usr/sbin/sshd -T -C "user=root,addr=${CHECK_CLIENT_IP},host=${CHECK_CLIENT_IP},laddr=${CHECK_SERVER_IP},lport=${CHECK_SERVER_PORT}"
```

这里以客户端 IP 作为测试的 `host` 值。若配置使用反向解析主机名匹配，需要按实际解析结果填写；也应针对新管理账号和实际访问来源分别核对。不要把一次全局输出当作所有来源、所有用户都已验证。

### 5. 重新加载并建立新连接

检查符合预期后执行：

```bash
/usr/sbin/sshd -t && systemctl reload ssh
```

从本机再次建立一条新的管理账号连接，并分别执行：

```bash
whoami
```

```bash
sudo whoami
```

确认分别输出自己的管理用户名和 `root`。然后尝试建立一条全新的 root SSH 连接，应被拒绝。应使用先前已验证可用的同一把密钥、同一个地址和端口，避免把错误地址、错误密钥或复用旧会话误判为策略验证成功。

图形客户端有时会把账号被拒绝显示为“用户名／公钥组合错误”或其他泛化错误，不能仅凭一句错误文本判断原因。需要结合服务器的有效配置和新管理账号的正常登录一起判断。

### 6. 验证成功后取消回滚

在**新管理账号会话**中执行：

```bash
sudo systemctl stop ssh-safety-rollback.timer
sudo /usr/sbin/sshd -T | awk '/^(permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication) /'
```

确认最终仍是预期设置。如果回滚已经执行，必须重新配置并验证，不要把被恢复后的配置当作加固完成。

如果新的管理账号无法登录，保留回滚任务，等待指定时间后重试；仍可用的旧会话也可以用来检查并恢复配置。已有 root 会话暂时还能使用属于正常现象，新策略主要限制后续新连接。

## 九、最终检查与日常使用

使用新管理账号执行：

```bash
whoami
sudo whoami
sudo ufw status verbose
sudo /usr/sbin/sshd -T | awk '/^(port|permitrootlogin|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication) /'
apt-config dump | awk '/APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::Automatic-Reboot /'
systemctl list-timers --all --no-pager apt-daily.timer apt-daily-upgrade.timer
```

检查结果应与自己的自定义参数一致：

| 检查项 | 预期结果 |
| --- | --- |
| 新的密钥连接 | 使用自己的管理用户名登录成功 |
| sudo 提权 | `sudo whoami` 输出 `root` |
| root 新连接 | 被拒绝，服务器有效配置为 `permitrootlogin no` |
| SSH 认证 | 公钥开启，密码及键盘交互认证关闭 |
| UFW | `active`，实际 SSH 端口在 IPv4、IPv6 均有正确规则 |
| APT 自动更新 | 两个周期配置为 `1`，对应定时器已启动并排期 |
| 自动重启 | 本文设置为 `false`，需要自己安排必要的维护重启 |
| 两个临时回滚任务 | 验证成功后已停止，配置未被自动恢复 |

日常通过普通管理账号登录，需要临时进入 root 环境时执行：

```bash
sudo -i
```

完成管理操作后执行 `exit` 返回普通用户。安装业务软件后，仍要维护业务软件自身的版本、账号、管理入口和授权信息。

基础配置检查通过，表示本教程覆盖的项目符合预期，不等于完成了公网扫描、漏洞审计或所有软件的安全检查。

## 十、按需自定义端口、客户端和多设备使用

### 1. 放行业务端口

下面以一个自行选择的端口为例，**先把数字改成服务实际监听的端口**：

```bash
SERVICE_PORT=8443
sudo ufw allow "${SERVICE_PORT}/tcp"
```

只有服务实际需要 UDP 时，才单独添加：

```bash
sudo ufw allow "${SERVICE_PORT}/udp"
```

检查结果：

```bash
sudo ufw status numbered
```

不再使用某项放行规则时，可以按完整规则删除，例如：

```bash
sudo ufw delete allow "${SERVICE_PORT}/tcp"
```

操作前确认目标是业务端口，不是当前依赖的 SSH 端口。不要为了省事开放整个端口范围。

商家安全组和系统防火墙是两层独立控制。商家层如果有阻断规则，仅在 UFW 中放行仍可能无法访问。本文的回滚任务不会修改商家安全组。

### 2. 自定义 SSH 端口

SSH 端口可以自定义，但本文主线使用**已有的实际 SSH 端口**，并不要求修改它。

修改 `SSH_PORT` 变量只会影响后续命令连接或放行的端口，不会修改 SSH 服务。若需要迁移监听端口，应另做一次有备份和回滚的变更：

1. 确认新端口未被占用，并在商家安全组及 UFW 中先放行新端口。
2. 在 SSH 服务中暂时同时监听旧端口和新端口，检查语法，再重新加载。
3. 通过新端口重新建立管理账号连接，并验证 sudo。
4. 验证成功后，再移除旧端口监听和对应放行规则，并取消该次回滚任务。

标准 OpenSSH 支持重复的 `Port` 项，但 `ListenAddress`、服务启动参数和 socket 激活配置也可能影响实际监听地址或端口。应核对 `ss -lntp`、服务单元及实际连接结果，不要只改一个数字就关闭旧入口。

### 3. 使用自己习惯的 SSH 客户端

本文不依赖具体客户端。只要客户端支持所选密钥类型，就可以使用其密钥导入功能，或直接选择本地私钥文件。

切换客户端时需要对应好：地址、实际 SSH 端口、管理用户名、私钥，以及私钥保护密码。服务器用户密码和 Passphrase 不是同一项。

### 4. Mac 与 Windows 共用一把密钥

同一把私钥可以复制到自己控制的 Mac 和 Windows 上使用。macOS 的 `chmod 600` 不会把文件绑定到 Mac，也不会阻止文件所有者复制它；传到 Windows 后，访问权限由 Windows 的 ACL 管理。

跨设备传输时使用可信的加密方式。无需为了复制到 Windows，把 Mac 私钥权限放宽为 `644` 或 `777`。

长期使用时，也可以为每台设备单独生成密钥，把各设备公钥分别加入管理账号的 `authorized_keys`。这样某台设备丢失时，只需撤销那台设备的公钥，不必同时替换其他设备的密钥。

## 十一、常见问题

### 1. `invalid format`：私钥格式无效

常见原因包括：选错文件、复制不完整、保存成 RTF 富文本、把带有字面量 `\n` 的字符串直接保存，或客户端不支持当前格式。

优先检查自己是否选择了本机生成的私钥文件，而不是 `.pub`、网页文本、截图或其他文档。扩展名不是判断依据。

macOS 可以只检查文件类型，不输出私钥内容：

```bash
file -b "$KEY_FILE"
ssh-keygen -y -f "$KEY_FILE" >/dev/null
```

Windows 可以重新运行：

```powershell
ssh-keygen -y -f $KeyFile > $null
if ($LASTEXITCODE -ne 0) { throw '私钥尚未通过解析检查。' }
```

如果私钥曾经手工保存，必须完整保留头尾标记、正文和换行。使用纯文本，不要只改富文本文件的后缀。没有备份且不能恢复时，应在仍有效的登录会话中部署新的公钥，验证成功后再撤销旧授权。

### 2. 私钥权限过宽

macOS：

```bash
chmod 700 "$HOME/.ssh"
chmod 600 "$KEY_FILE"
```

Windows 的修复方式不同。下面的 PowerShell 示例**仅修改 `$KeyFile` 指向的单个私钥文件**，将所有者设为当前 Windows 用户，并只给该用户显式文件访问权限。先核对路径，不要改成整个用户目录或磁盘。

```powershell
$KeyFile = Join-Path $env:USERPROFILE '.ssh\vps_ed25519'
$CurrentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$PrivateAcl = [System.Security.AccessControl.FileSecurity]::new()
$PrivateAcl.SetOwner($CurrentSid)
$PrivateAcl.SetAccessRuleProtection($true, $false)
$PrivateRule = [System.Security.AccessControl.FileSystemAccessRule]::new(
    $CurrentSid,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow
)
$PrivateAcl.AddAccessRule($PrivateRule)
Set-Acl -LiteralPath $KeyFile -AclObject $PrivateAcl
Get-Acl -LiteralPath $KeyFile | Format-List Owner, AccessToString
```

如果文件所有者不是自己、文件位于共享目录、文件系统不支持相应 ACL，或账号受组织策略管理，应先按实际情况处理，不要直接放宽全目录权限。

权限保护不等于加密，也不能防止以同一用户身份运行的恶意程序读取文件。私钥 Passphrase 和设备本身的安全仍然重要。[Windows OpenSSH 权限说明](https://github.com/PowerShell/Win32-OpenSSH/wiki/Security-protection-of-various-files-in-win32-openssh)

### 3. 提示用户名或公钥不匹配

检查地址、端口、用户名、选择的私钥是否正确，以及目标用户的 `authorized_keys` 是否包含对应公钥。一个账号授权了公钥，不代表另一个账号自动也被授权。

服务器上可以查看相关日志：

```bash
sudo journalctl -u ssh -n 50 --no-pager
```

如果只是在关闭 root 直登后，root 新连接失败，而新管理账号可以正常通过密钥登录，这是预期结果；结合有效配置确认，不要直接重新生成所有密钥。

### 4. 防火墙启用后无法建立新连接

优先使用仍有效的旧会话检查端口和规则，或等待已经确认启动的临时回滚任务到时执行。如果旧会话仍可用，也可以手动关闭本文刚启用的 UFW：

```bash
sudo ufw disable
```

它会关闭 UFW 并取消其开机启用配置，只适合明确需要撤销本次 UFW 启用的场景。重新确认实际监听端口、IPv4/IPv6、商家安全组和客户端参数后，再安排回滚并重新配置。

### 5. 定时器出现同名任务已存在

先查看任务状态：

```bash
systemctl list-timers --all --no-pager ufw-safety-rollback.timer ssh-safety-rollback.timer
```

不要无条件停止一个仍在保护当前改动的回滚任务。先明确它对应哪次变更、是否已经完成连接验证，再决定取消、等待回滚或使用新的任务名称。

### 6. 软件更新以后是否还需要检查

需要。自动更新负责允许来源中的系统软件包；通过脚本安装的应用、节点核心和管理面板通常有自己的更新方式。内核更新后也可能需要维护重启。

每次变更 SSH、防火墙或商家安全组，都应保留有效连接、准备适用于本次变更的回滚，并通过新连接验证。备份私钥、用户密码和必要的业务配置，确认自己知道商家的恢复渠道。

### 7. 公钥丢失、私钥丢失和更换密钥

有私钥时，可以使用 `ssh-keygen -y -f 私钥路径` 重新导出对应公钥；反过来，仅凭公钥不能恢复私钥。导出时把输出保存为新的公钥文件，不能覆盖私钥本身。

更换密钥时，先把新公钥追加到目标账号的 `authorized_keys`，通过新私钥建立新连接并验证 sudo，再删除旧公钥对应的那一行。不要直接清空整个授权文件。

如果丢失了唯一私钥，又没有其他已授权设备、有效会话或商家恢复入口，仅靠记得用户密码不能绕过本文已关闭的 SSH 密码认证。这也是需要提前做好加密备份的原因。

## 参考资料

- [Debian 安全信息](https://www.debian.org/security/)
- [OpenSSH ssh-keygen 手册](https://man.openbsd.org/ssh-keygen.1)
- [Microsoft：OpenSSH 密钥认证](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)
- [Windows OpenSSH 文件权限说明](https://github.com/PowerShell/Win32-OpenSSH/wiki/Security-protection-of-various-files-in-win32-openssh)
- [Debian 13 sshd\_config 手册](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)
- [Debian 13 sshd 手册](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html)
- [Debian 13 UFW 手册](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)
- [Debian 13 systemd-run 手册](https://manpages.debian.org/trixie/systemd/systemd-run.1.en.html)
- [Debian 13 unattended-upgrade 手册](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html)