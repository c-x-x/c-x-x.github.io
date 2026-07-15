+++
title = "Hugo 博客部署到 GitHub Pages 完全指南"
date = 2026-06-13
draft = false
tags = ["Hugo", "GitHub Pages", "GitHub Actions", "部署", "CI/CD"]
categories = ["教程"]
image = "/posts/github-pages-deployment-guide/images/cover.webp"
description = "完整的 Hugo 博客部署教程，从创建 GitHub 仓库到配置 Actions 自动化部署，包含自定义域名和日常更新流程。"
+++

## 前言

本文详细介绍如何将 Hugo 静态博客部署到 GitHub Pages，使用 GitHub Actions 实现自动化部署，以及后续如何更新文章。无需手动构建，每次提交代码后自动部署。

## 一、准备工作

### 1.1 本地环境

确保已安装：
- Git
- Hugo Extended 版本
- GitHub 账号

### 1.2 Hugo 项目结构

```
my-blog/
├── .github/
│   └── workflows/
│       └── hugo.yml          # GitHub Actions 配置
├── archetypes/
├── content/
│   └── posts/                # 文章目录
├── static/
├── go.mod                    # Hugo Module 依赖
├── hugo.toml                 # Hugo 配置文件
└── .gitignore
```

## 二、创建 GitHub 仓库

### 2.1 仓库命名规则

有两种选择：

**选项 A：用户/组织主页（推荐）**
- 仓库名：`username.github.io`
- 访问地址：`https://username.github.io/`
- 示例：`c-x-x.github.io` → `https://c-x-x.github.io/`

**选项 B：项目页面**
- 仓库名：任意名称（如 `blog`）
- 访问地址：`https://username.github.io/blog/`
- 需要修改 `hugo.toml` 中的 `baseURL`

### 2.2 创建仓库步骤

1. 登录 GitHub
2. 点击右上角 **+** → **New repository**
3. 填写仓库名（如 `c-x-x.github.io`）
4. 设置为 **Public**（GitHub Pages 免费版需要公开仓库）
5. **不要**勾选任何初始化选项（README、.gitignore、License）
6. 点击 **Create repository**

## 三、配置 GitHub Actions

### 3.1 创建 .gitignore

在项目根目录创建 `.gitignore` 文件：

```gitignore
# Hugo
/public/
/resources/_gen/
/assets/jsconfig.json
hugo_stats.json

# Hugo build lock
.hugo_build.lock

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Node
node_modules/
package-lock.json
```

### 3.2 创建 GitHub Actions 工作流

创建 `.github/workflows/hugo.yml` 文件：

```yaml
name: Deploy Hugo site to Pages

on:
  # 推送到 main 分支时触发
  push:
    branches:
      - main
  # 允许手动触发
  workflow_dispatch:

# 设置权限
permissions:
  contents: read
  pages: write
  id-token: write

# 只允许一个并发部署
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # 构建任务
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.20'
          cache: true

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true

      - name: Build
        run: |
          hugo mod get
          hugo --minify

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  # 部署任务
  deploy:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      pages: write
      id-token: write
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3.3 工作流说明

**触发条件：**
- `push` 到 `main` 分支时自动触发
- `workflow_dispatch` 允许手动触发

**构建步骤：**
1. **Checkout** - 检出站点源码
2. **Setup Go** - 提供 Hugo Module 所需的 Go 环境
3. **Setup Hugo** - 安装 Hugo Extended
4. **Build** - 下载模块并构建静态文件
5. **Upload artifact** - 上传构建产物到 GitHub

**部署步骤：**
- 将构建产物部署到 GitHub Pages

## 四、初始化 Git 并推送

### 4.1 配置 Git 用户信息

```bash
# 仅为当前仓库配置（推荐）
git config user.name "Your Name"
git config user.email "your-email@example.com"

# 或全局配置
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### 4.2 初始化并提交

```bash
# 初始化 Git 仓库（如果还未初始化）
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "Initial commit: Hugo blog setup

- Custom theme with modern design
- GitHub Actions deployment configured
- Responsive layout
- Dark/Light theme toggle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### 4.3 推送到 GitHub

```bash
# 添加远程仓库
git remote add origin https://github.com/username/username.github.io.git

# 重命名分支为 main（如果是 master）
git branch -M main

# 推送代码
git push -u origin main
```

## 五、配置 GitHub Pages

### 5.1 启用 GitHub Pages

1. 访问仓库页面：`https://github.com/username/username.github.io`
2. 点击 **Settings** 标签
3. 左侧菜单找到 **Pages**
4. 在 **Build and deployment** 部分：
   - **Source** 选择：`GitHub Actions`
   - **不要**选择 "Deploy from a branch"
5. 保存配置

### 5.2 查看部署状态

1. 点击仓库顶部的 **Actions** 标签
2. 查看 "Deploy Hugo site to Pages" 工作流
3. 等待显示 ✅ 绿色勾（大约 2-3 分钟）
4. 部署成功后，访问 `https://username.github.io/`

### 5.3 常见问题排查

**问题 1：环境保护规则错误**
```
Branch "main" is not allowed to deploy to github-pages
```

**解决方案：**
1. 访问 `Settings → Environments`
2. 点击 `github-pages` 环境
3. 在 **Deployment branches and tags** 选择 **All branches**
4. 保存后重新运行工作流

**问题 2：构建失败**

检查 Actions 日志，常见原因：
- Hugo 版本不兼容
- 主题文件缺失
- `hugo.toml` 配置错误

**问题 3：页面 404**

确保：
- GitHub Pages Source 设置为 `GitHub Actions`
- 构建成功完成
- 等待 DNS 传播（最多 10 分钟）

## 六、配置自定义域名（可选）

### 6.1 在 GitHub 配置域名

1. 访问 `Settings → Pages`
2. **Custom domain** 输入你的域名：`blog.example.com`
3. 点击 **Save**
4. 等待 DNS 检查通过
5. 勾选 **Enforce HTTPS**

### 6.2 配置 DNS 记录

在域名 DNS 管理面板添加：

**CNAME 记录（推荐）：**
```
类型: CNAME
名称: blog
值: username.github.io
TTL: 3600
```

**或 A 记录：**
```
类型: A
名称: blog
值: 185.199.108.153
值: 185.199.109.153
值: 185.199.110.153
值: 185.199.111.153
TTL: 3600
```

### 6.3 更新 Hugo 配置

修改 `hugo.toml`：

```toml
baseURL = 'https://blog.example.com/'
```

提交并推送：

```bash
git add hugo.toml
git commit -m "Update baseURL for custom domain"
git push
```

## 七、后期更新文章

### 7.1 创建新文章

使用 Hugo 命令创建：

```bash
hugo new posts/my-new-post.md
```

或手动创建文件 `content/posts/my-new-post.md`：

```markdown
+++
title = "我的新文章"
date = 2026-06-14
draft = false
tags = ["标签1", "标签2"]
categories = ["分类"]
+++

## 文章内容

这是文章正文...
```

### 7.2 本地预览

启动开发服务器：

```bash
hugo server -D
```

访问 `http://localhost:1313` 预览效果。

### 7.3 提交并部署

```bash
# 添加新文章
git add content/posts/my-new-post.md

# 或添加所有修改
git add .

# 提交
git commit -m "Add: 新文章标题

- 添加文章内容描述
- 相关修改说明

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

# 推送到 GitHub
git push
```

### 7.4 自动部署流程

推送后，GitHub Actions 会自动：

1. 检测到代码变更
2. 触发工作流
3. 构建 Hugo 站点
4. 部署到 GitHub Pages
5. 2-3 分钟后生效

查看部署进度：
- 访问 `https://github.com/username/username.github.io/actions`
- 查看最新的工作流运行状态

## 八、日常维护工作流

### 8.1 标准工作流

```bash
# 1. 拉取最新代码（多人协作时）
git pull

# 2. 创建新文章
hugo new posts/article-name.md

# 3. 编辑文章内容
# 使用你喜欢的编辑器编辑 content/posts/article-name.md

# 4. 本地预览
hugo server -D

# 5. 确认无误后提交
git add .
git commit -m "Add: 文章标题"
git push

# 6. 等待自动部署（2-3分钟）
```

### 8.2 修改已发布文章

```bash
# 1. 编辑文章
vim content/posts/existing-article.md

# 2. 更新 lastmod 日期（可选）
# 在文章 front matter 中添加：
# lastmod = 2026-06-14

# 3. 提交
git add content/posts/existing-article.md
git commit -m "Update: 文章标题 - 更新说明"
git push
```

### 8.3 删除文章

```bash
# 1. 删除文章文件
git rm content/posts/old-article.md

# 2. 提交
git commit -m "Remove: 旧文章标题"
git push
```

### 8.4 修改主题或配置

```bash
# 1. 修改配置文件
vim hugo.toml

# 2. 更新主题模块
hugo mod get -u github.com/c-x-x/hugo-theme-imx

# 3. 本地测试
hugo server

# 4. 提交
git add .
git commit -m "Update: 主题样式优化"
git push
```

## 九、高级技巧

### 9.1 草稿文章

创建草稿（不会在生产环境显示）：

```markdown
+++
title = "草稿文章"
date = 2026-06-14
draft = true  # 设置为草稿
+++
```

本地预览草稿：
```bash
hugo server -D  # -D 参数显示草稿
```

发布草稿：
```bash
# 将 draft = true 改为 draft = false
# 或直接删除 draft 字段
```

### 9.2 定时发布

设置未来日期：

```markdown
+++
title = "未来发布的文章"
date = 2026-06-20  # 未来日期
draft = false
+++
```

Hugo 默认不会构建未来日期的文章。在 GitHub Actions 中可以添加：

```yaml
- name: Build
  run: hugo --minify --buildFuture
```

### 9.3 多人协作

使用分支工作流：

```bash
# 创建功能分支
git checkout -b feature/new-article

# 编辑文章
hugo new posts/collaborative-post.md

# 提交到功能分支
git add .
git commit -m "Add: 新文章"
git push -u origin feature/new-article

# 在 GitHub 创建 Pull Request
# 审核通过后合并到 main 分支
# 自动触发部署
```

### 9.4 查看构建日志

如果部署失败：

1. 访问 `Actions` 标签
2. 点击失败的工作流
3. 展开各个步骤查看错误信息
4. 根据错误信息修复问题
5. 推送修复后自动重新部署

## 十、性能优化

### 10.1 图片优化

使用 WebP 格式和合适的尺寸：

```bash
# 安装 imagemagick
# 转换为 WebP
convert original.jpg -quality 80 optimized.webp
```

### 10.2 缓存配置

在 `hugo.toml` 中配置：

```toml
[caches]
  [caches.assets]
    dir = ":resourceDir/_gen"
    maxAge = "720h"
  [caches.images]
    dir = ":resourceDir/_gen"
    maxAge = "720h"
```

### 10.3 启用 CDN

GitHub Pages 已经使用 CDN，但你也可以：

1. 使用 Cloudflare（免费）
2. 将静态资源托管到对象存储
3. 使用 jsDelivr 加速 GitHub 资源

## 十一、总结

### 优势

✅ **完全免费** - GitHub Pages 提供免费托管  
✅ **自动部署** - 推送代码即自动部署  
✅ **版本控制** - Git 管理所有变更  
✅ **高可用性** - GitHub 提供稳定服务  
✅ **HTTPS 支持** - 自动提供 SSL 证书  
✅ **自定义域名** - 支持绑定个人域名  

### 工作流总结

**日常更新文章：**
```bash
hugo new posts/new-article.md  # 创建文章
hugo server -D                  # 本地预览
git add .                       # 添加文件
git commit -m "Add: 文章标题"   # 提交
git push                        # 推送并自动部署
```

**所需时间：**
- 编写文章：根据内容而定
- 本地预览：即时
- 提交推送：< 1 分钟
- 自动部署：2-3 分钟
- 总计：约 5 分钟内上线

### 常用命令速查

```bash
# 创建文章
hugo new posts/article.md

# 本地预览
hugo server -D

# 本地构建
hugo

# Git 操作
git add .
git commit -m "message"
git push

# 查看远程仓库
git remote -v

# 查看提交历史
git log --oneline

# 撤销本地修改
git checkout -- <file>
```

## 参考资源

- [Hugo 官方文档](https://gohugo.io/documentation/)
- [GitHub Pages 文档](https://docs.github.com/pages)
- [GitHub Actions 文档](https://docs.github.com/actions)
- [Markdown 语法指南](https://www.markdownguide.org/)

---

现在你已经掌握了从零到部署的完整流程！开始写作，分享你的知识和见解吧！✨
