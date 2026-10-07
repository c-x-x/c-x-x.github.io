+++
title = "Google / Squarespace 域名接入 Cloudflare DNS：完整保姆级教程"
slug = "google-squarespace-yu-ming-jie-ru-cloudflare-dns-wan-zheng-bao-mu-ji-jiao-cheng"
date = "2026-10-07T13:47:15+08:00"
draft = false
categories = ["教学"]
tags = ["域名", "Google", "Cloudflare"]
image = "/posts/google-squarespace-yu-ming-jie-ru-cloudflare-dns-wan-zheng-bao-mu-ji-jiao-cheng/images/cover.webp"
description = "购买Google Workspace的域名后，如何托管到CF？"
featured = true
toc = true
+++
> 适用场景：**域名继续在原注册商（例如 Google / Squarespace）续费，不转移注册商，只把 DNS 托管到 Cloudflare。**
>
> 本文面向第一次接触域名、DNS、Nameserver、Cloudflare 的用户，按“先解释，再操作，再验证，再收尾”的顺序编写。

---

# 隐私说明

本文中的所有账号、邮箱、域名、IP、Nameserver、DNSSEC 参数、密钥标记、摘要等示例均为**虚构或保留测试值**，不对应真实账户。

示例：

```text
域名：aurora-lab.example
邮箱：admin@aurora-lab.example
个人邮箱：owner.demo42@gmail.com

测试 IP：
192.0.2.44
192.0.2.45
198.51.100.44
198.51.100.45

示例 Cloudflare Nameserver：
atlas.ns.cloudflare.example
lyra.ns.cloudflare.example
```

`.example` 是专门用于文档示例的保留域名后缀。操作时必须以你自己的 Cloudflare / Squarespace 页面显示的实际值为准，**不要照抄本文示例值**。

---

# 一、先理解我们到底在做什么

这次操作不是“把域名转到 Cloudflare”，而是：

```text
域名注册 / 续费
Google / Squarespace
        │
        │ 只修改 Nameserver
        ▼
Cloudflare
负责 DNS / CDN / SSL / 安全
        │
        ▼
网站源站
Squarespace / GitHub Pages / Vercel / VPS 等
```

最终分工：

| 部分 | 由谁负责 |
| --- | --- |
| 域名所有权 | 原注册商 |
| 域名续费 | 原注册商 |
| 信用卡扣款 | 原注册商 / 原付款系统 |
| Nameserver | Cloudflare |
| DNS 记录 | Cloudflare |
| CDN / 代理 | Cloudflare |
| SSL/TLS | Cloudflare |
| DNSSEC 权威签名 | Cloudflare |
| 网站实际内容 | 你的建站平台或服务器 |

---

# 二、最重要：不要点 Transfer Domain

Cloudflare 里经常会看到两类操作：

## Add / Connect Domain

这是我们需要的：

```text
域名仍在原注册商
只是把 DNS 托管给 Cloudflare
```

## Transfer Domain

**这次不要做。**

它会把注册商也迁到 Cloudflare Registrar，可能涉及：

- 转移授权码
- 注册商变化
- 续费体系变化
- 转移费用
- 原来的优惠续费价格失效

本教程全过程的核心是：

> **改 Nameserver，不转移域名。**

---

# 三、DNS、Nameserver、注册商分别是什么

## Registrar：注册商

负责：

- 域名是谁的
- 什么时候到期
- 续费
- 域名锁
- 域名转移
- 指定 Nameserver

## Nameserver

Nameserver 可以理解为：

> “这个域名的 DNS 账本由谁负责？”

例如从：

```text
ns1.old-dns.example
ns2.old-dns.example
```

改成：

```text
atlas.ns.cloudflare.example
lyra.ns.cloudflare.example
```

之后全世界查询你的域名 DNS 时，就会去问 Cloudflare。

## DNS Record

DNS 记录是：

> “这个域名具体指向哪里？”

例如：

```text
A       @       192.0.2.44
CNAME   www     site-host.example
MX      @       mail.example
TXT     @       verification=xxxx
```

所以：

```text
Nameserver = 谁管 DNS
DNS Record = DNS 里具体写了什么
```

---

# 四、迁移前的四条原则

1. **先复制，再切换**
2. **先 1:1 迁移，再优化**
3. **迁移 DNS 和清理旧记录不要同时做**
4. **DNSSEC 必须先关旧的，再换 Nameserver**

不要一次性同时：

```text
删 DNS
换 Nameserver
开代理
改 SSL
清邮件记录
```

---

# 五、第一步：在 Cloudflare 添加域名

登录 Cloudflare：

```text
Domains
→ Add a domain / Connect a domain
```

只填写主域名：

```text
aurora-lab.example
```

不要填写：

```text
https://aurora-lab.example
www.aurora-lab.example
aurora-lab.example/path
```

选择：

```text
Free
```

普通个人网站、博客、作品集、小型站点使用免费套餐即可完成：

- 权威 DNS
- CDN
- Universal SSL
- DDoS 基础防护
- 缓存
- 基础安全能力

---

# 六、AI 爬虫和 Bot 设置

这些与 DNS 是否能正常托管没有直接关系。

第一次迁移建议：

```text
广告相关：不勾
搜索：保持默认
代理：保持默认
训练：根据个人偏好
Bot Preference Sync：可暂时关闭
DNS Import：自动
```

---

# 七、第二步：让 Cloudflare 扫描现有 DNS

Cloudflare 会自动扫描原 DNS。

但必须注意：

> Cloudflare 自动扫描不是 100% 完整。

所以不能看到扫描结果就直接改 Nameserver。

---

# 八、第三步：打开原注册商 DNS 页面逐条核对

同时打开两个标签页：

```text
标签页 A：Cloudflare DNS
标签页 B：Squarespace DNS
```

逐条比较：

- A
- AAAA
- CNAME
- MX
- TXT
- HTTPS / SVCB
- SRV
- CAA

---

# 九、常见 DNS 记录解释

## A

```text
A
aurora-lab.example
192.0.2.44
```

表示：

```text
域名 → IPv4
```

## AAAA

表示：

```text
域名 → IPv6
```

## CNAME

```text
CNAME
www
site-host.example
```

表示：

```text
www.aurora-lab.example
→ site-host.example
```

## MX

决定自定义域名邮箱的收件服务器。

## TXT

常用于：

- SPF
- DKIM
- DMARC
- Google 验证
- GitHub 验证
- 域名所有权验证

第一次迁移时，不要因为“看不懂”就删除。

## HTTPS Record

可能长这样：

```text
HTTPS
@
1 . alpn="h2,http/1.1" ipv4hint="192.0.2.44,192.0.2.45"
```

如果 Cloudflare 扫描漏了，初次 1:1 迁移时可以手动补上。

在 Cloudflare 里通常拆成：

```text
Type: HTTPS
Name: @
Priority: 1
Target: .
Value:
alpn="h2,http/1.1" ipv4hint="192.0.2.44,192.0.2.45"
```

注意 `1 .` 不要重复写进 Value。

---

# 十、第四步：第一次迁移先全部使用 DNS Only

Cloudflare 的 A / AAAA / CNAME 记录通常可以选择：

```text
灰云：DNS Only
橙云：Proxied
```

第一次迁移建议：

> **所有可代理记录先设置为 DNS Only。**

这样只是更换 DNS 提供商，不改变网站访问路径，最容易排错。

---

# 十一、DNS Only 和 Proxied 的区别

## DNS Only

```text
用户
  ↓
Cloudflare DNS
  ↓
直接访问源站
```

## Proxied

```text
用户
  ↓
Cloudflare
  ↓
源站
```

Cloudflare 可以参与：

- CDN
- 缓存
- DDoS 防护
- WAF
- HTTPS
- 隐藏源站
- 规则

---

# 十二、哪些记录应该开橙云

迁移稳定后，真正承载 Web 流量的记录通常可以代理：

```text
A      @
AAAA   @
CNAME  www
CNAME  blog
CNAME  app
```

这些通常保持 DNS Only：

```text
MX
TXT
_domainconnect
DKIM
SPF
DMARC
验证类 CNAME
```

---

# 十三、第五步：关闭旧 DNSSEC

在 Squarespace：

```text
Domains
→ 域名
→ DNS
→ DNSSEC
```

如果开启：

> **先关闭 DNSSEC。**

原因：旧 DNSSEC 的密钥与旧权威 DNS 绑定。若直接换 Nameserver，可能导致：

```text
SERVFAIL
```

正确顺序：

```text
关闭旧 DNSSEC
        ↓
确认关闭
        ↓
再修改 Nameserver
```

---

# 十四、第六步：获取 Cloudflare Nameserver

Cloudflare 会给每个域名分配两个 Nameserver。

示例：

```text
atlas.ns.cloudflare.example
lyra.ns.cloudflare.example
```

必须使用你自己 Cloudflare 页面里的真实值。

---

# 十五、第七步：在 Squarespace 修改 Nameserver

路径：

```text
Squarespace
→ Domains
→ 你的域名
→ DNS
→ Domain Nameservers
→ Use Custom Nameservers
```

Squarespace 可能要求：

- 密码
- Authenticator
- 2FA
- Backup Code
- 重新登录

验证后删除旧 Nameserver，只保留 Cloudflare 给出的两个。

不要操作：

```text
Nameserver Registration
```

它是高级 glue record 功能，与本教程无关。

---

# 十六、第八步：回 Cloudflare 确认激活

修改 Nameserver 后回 Cloudflare，确认：

```text
I have updated my nameservers
```

刚开始可能显示：

```text
Pending
```

最终应变成：

```text
Active
```

---

# 十七、激活后先测试网站

测试：

```text
https://aurora-lab.example
https://www.aurora-lab.example
```

确认：

- 正常打开
- 无证书错误
- 无无限重定向
- 页面内容正常
- 根域和 www 都正常

如果异常，先不要继续开代理或 DNSSEC。

---

# 十八、第九步：开启 Cloudflare 橙云代理

确认网站正常后，把真正的网站记录改成：

```text
Proxied
```

例如：

```text
A      @      192.0.2.44         Proxied
A      @      192.0.2.45         Proxied
CNAME  www    site-host.example  Proxied
```

继续保持 DNS Only：

```text
CNAME  _domainconnect
MX
TXT SPF
TXT DKIM
TXT DMARC
```

---

# 十九、手动 HTTPS Record 怎么处理

如果迁移阶段手动复制了：

```text
HTTPS @ ...
```

当同名网站记录已经：

- 开启代理
- 开启 Universal SSL
- 使用 HTTP/2 或 HTTP/3

Cloudflare 会自动生成 HTTPS Service Record。

因此：

> 对已 Proxied 的名字，同名手工 HTTPS Record 通常不会被对外提供。

建议：

```text
迁移阶段：可以保留
稳定后：确认无依赖，再清理
```

---

# 二十、第十步：检查 SSL/TLS

路径：

```text
Cloudflare
→ SSL/TLS
→ Overview
```

常见模式：

```text
Off
Flexible
Full
Full (strict)
```

## 不推荐 Flexible

它是：

```text
浏览器 → Cloudflare：HTTPS
Cloudflare → 源站：HTTP
```

可能导致重定向循环。

## Full

```text
浏览器 → Cloudflare：HTTPS
Cloudflare → 源站：HTTPS
```

迁移初期常用。

## Full (strict)

```text
浏览器 → Cloudflare：HTTPS
Cloudflare → 源站：HTTPS + 严格验证源站证书
```

源站证书确认无误后可考虑升级。

---

# 二十一、第十一步：重新开启 Cloudflare DNSSEC

等以下条件都满足后：

- Cloudflare Active
- 网站正常
- DNS 记录正确
- SSL 正常

再：

```text
Cloudflare
→ DNS
→ Settings
→ DNSSEC
→ Enable
```

Cloudflare 会生成 DS 信息。

随机示例：

```text
Key Tag:       48127
Algorithm:     13
Digest Type:   2
Digest:
8D97E6B6A46F53D4C709F4191656832BB5C6CB8B0614F6B4B7722F399842BA91
```

---

# 二十二、在 Squarespace 添加 Cloudflare DS Record

路径通常是：

```text
Domains
→ 域名
→ DNS
→ DNSSEC
→ Add Record
```

填写对应关系：

| Squarespace | Cloudflare |
| --- | --- |
| Key Tag | Key Tag |
| Algorithm | Algorithm |
| Digest Type | Digest Type |
| Digest | Digest |

不要把 `Public Key` 填进 DS Record。

保存后，等待 DNSSEC 状态显示正常。

---

# 二十三、Multi-Signer DNSSEC 要不要开

普通用户：

> **不要开。**

它用于多个权威 DNS 提供商共同签名，属于高级高可用架构。

---

# 二十四、最终推荐架构

```text
                域名注册局
                    │
                    ▼
         Google / Squarespace
         ─────────────────
         域名所有权
         域名续费
         域名锁
         DS Record
                    │
              Nameserver
                    ▼
             Cloudflare
         ─────────────────
         权威 DNS
         DNSSEC
         CDN
         SSL/TLS
         DDoS 防护
         缓存
         WAF / Rules
                    │
                    ▼
             网站源站
        ─────────────────
        Squarespace
        GitHub Pages
        Vercel
        VPS
        其他服务
```

---

# 二十五、迁移后哪里改什么

## 域名续费、锁定、转移

```text
Squarespace / 原注册商
```

## A / AAAA / CNAME / MX / TXT

```text
Cloudflare
→ DNS
→ Records
```

## SSL / CDN / 缓存 / WAF

```text
Cloudflare
```

## 网站内容

```text
Squarespace / GitHub / Vercel / VPS
```

---

# 二十六、原 Squarespace DNS 记录要不要删

通常：

> 不急着删。

Nameserver 已指向 Cloudflare 后，原 Squarespace DNS 区域里的普通记录不再是权威来源。

保留一段时间还可以作为旧配置备份。

---

# 二十七、旧邮件记录能不能删

如果以前使用过企业邮箱，可能残留：

```text
MX
TXT SPF
TXT DKIM
```

建议：

```text
先完成 DNS 迁移
↓
稳定几天
↓
确认旧邮箱真的不用
↓
再单独清理
```

不要在迁移当天同时清邮件记录。

---

# 二十八、常见故障排查

## Cloudflare 一直 Pending

检查：

```text
原注册商 Nameserver
```

是否完全等于 Cloudflare 分配的两个 Nameserver。

不要混用旧 NS 和 Cloudflare NS。

## 换 NS 后整个域名打不开

第一优先检查：

```text
旧 DNSSEC / DS Record 是否还存在
```

旧 DS 没清掉容易导致 `SERVFAIL`。

## 网站可以开，邮件坏了

检查：

```text
MX
SPF
DKIM
DMARC
```

是否完整迁移。

## 根域能开，www 打不开

检查：

```text
CNAME www
```

## www 能开，根域打不开

检查：

```text
A @
AAAA @
```

## 出现重定向循环

重点检查 Cloudflare SSL/TLS 模式，尤其是 `Flexible`。

## 开橙云后异常，灰云正常

问题通常发生在：

```text
Cloudflare Proxy
SSL
缓存
源站 Host
安全规则
```

临时改回 `DNS Only` 可以帮助定位。

---

# 二十九、最安全的回滚方案

如果切换 Nameserver 后出现严重问题：

1. 不删除 Cloudflare 配置
2. 回原注册商
3. 把 Nameserver 改回迁移前记录
4. 等 DNS 缓存刷新
5. 恢复稳定后再决定是否重试

迁移前最好保存：

```text
原 Nameserver 截图
原 DNS Record 截图
原 DNSSEC 状态
```

---

# 三十、迁移检查清单

## 迁移前

- [ ] 已确认不是 Transfer Domain
- [ ] 已保存原 DNS 截图
- [ ] 已保存原 Nameserver
- [ ] 已核对 A / AAAA / CNAME
- [ ] 已核对 MX / TXT
- [ ] 已核对 HTTPS / SVCB / SRV / CAA
- [ ] Cloudflare 初始记录先设置 DNS Only
- [ ] 已关闭旧 DNSSEC

## 切换 Nameserver

- [ ] Cloudflare 提供两个 NS
- [ ] 原注册商删除旧 NS
- [ ] 只保留 Cloudflare NS
- [ ] 保存
- [ ] Cloudflare 显示 Active

## 激活后

- [ ] 根域正常
- [ ] www 正常
- [ ] HTTPS 正常
- [ ] 网站 A / CNAME 开橙云
- [ ] 邮件 / 验证记录保持 DNS Only
- [ ] `_domainconnect` 保持 DNS Only
- [ ] SSL/TLS 至少为 Full
- [ ] Cloudflare DNSSEC 已开启
- [ ] 注册商 DS Record 已正确配置
- [ ] DNSSEC 显示有效

---

# 三十一、推荐的最终代理状态

| Type | Name | 用途 | 推荐状态 |
| --- | --- | --- | --- |
| A | @ | 网站 | Proxied |
| A | @ | 网站 | Proxied |
| CNAME | www | 网站 | Proxied |
| CNAME | \_domainconnect | 自动配置 | DNS Only |
| MX | @ | 邮件 | DNS Only |
| TXT | @ | SPF | DNS Only |
| TXT | selector.\_domainkey | DKIM | DNS Only |
| TXT | \_dmarc | DMARC | DNS Only |
| HTTPS | @ | HTTPS Service | 迁移阶段可保留；代理后通常由 Cloudflare 自动处理 |

---

# 三十二、几个不要犯的错误

1. **不要为了用 Cloudflare DNS 去 Transfer Domain**
2. **不要 DNSSEC 开着直接换 Nameserver**
3. **不要同时保留旧 NS 和 Cloudflare NS**
4. **不要把 Nameserver Registration 当成 Nameserver 设置**
5. **不要因为看不懂就删 TXT / MX**
6. **不要在刚迁移完成时同时修改一堆 SSL / DNS / 邮件配置**

---

# 三十三、这套架构的好处

## 域名价格和 DNS 服务解耦

```text
注册商续费便宜
→ 域名继续留着

Cloudflare DNS 强
→ DNS 交给 Cloudflare
```

## 网站以后随便换

```text
Cloudflare → Squarespace
Cloudflare → GitHub Pages
Cloudflare → Vercel
Cloudflare → VPS
```

都不需要转移域名。

## DNS 统一管理

以后：

```text
blog.example
api.example
status.example
www.example
```

都可以在 Cloudflare 集中管理。

---

# 三十四、一句话理解整套系统

```text
注册商
负责“这个域名属于谁”

Nameserver
负责“DNS 去问谁”

DNS Record
负责“这个名字指向哪里”

Cloudflare Proxy
负责“让 Web 流量经过 Cloudflare”

源站
负责“真正提供网页内容”

DNSSEC
负责“证明 DNS 答案没有被伪造”
```

---

# 三十五、最终结论

如果目标是：

> 保留原注册商的域名续费价格，同时使用 Cloudflare 的 DNS、CDN、SSL 和安全能力

最合理的结构是：

```text
原注册商
负责域名和续费
        │
        ▼
Cloudflare Nameserver
        │
        ▼
Cloudflare DNS / CDN / SSL / DNSSEC
        │
        ▼
网站源站
```

全程最重要的三条：

> **不要 Transfer Domain。**  
> **换 Nameserver 前先关闭旧 DNSSEC。**  
> **先 1:1 迁移，稳定后再开代理和做清理。**