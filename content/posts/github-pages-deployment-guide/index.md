+++
title = 'Hugo 博客部署到 GitHub Pages 完全指南'
date = 2026-06-13
lastmod = 2026-09-26T12:00:00+08:00
draft = false
tags = ['Hugo', 'GitHub Pages', 'GitHub Actions', '部署']
categories = ['教程']
image = '/posts/github-pages-deployment-guide/images/cover-v2.webp'
description = '以 IMX 博客为例，配置可复现的 GitHub Actions 构建、Pages 发布、自定义域名与日常更新。'
toc = true
+++

本篇从一个已经能运行 `hugo --minify` 的博客开始。还没有站点，可以先完成 [Hugo 与 IMX 入门指南](/posts/hugo-imx-theme-tutorial/)；需要调整主题细节，参见 [IMX 主题配置指南](/posts/hugo-theme-imx-configuration-guide/)。

![从本地博客经工作流发布到 GitHub Pages 的概念图](images/cover-v2.webp)

## 1. 确认仓库与站点地址

GitHub Pages 有两种常见地址，`baseURL` 必须与最终公开地址对应：

| 类型 | 仓库名 | `baseURL` |
| --- | --- | --- |
| 用户站点 | `your-name.github.io` | `https://your-name.github.io/` |
| 项目站点 | `my-blog` | `https://your-name.github.io/my-blog/` |

本站是用户站点，但使用自定义域名，所以 `hugo.toml` 中写的是 `baseURL = 'https://blog.cxx.pub/'`。项目站点尤其要保留末尾的仓库路径；否则页面链接、图片或样式可能指向错误位置。

在发布前检查本地环境与构建：

```bash
hugo version
go version
hugo --minify
```

IMX 需要 Hugo Extended 和 Go。Hugo Module 的依赖应记录在 `go.mod`、`go.sum`，并连同 `hugo.toml` 一起提交。将 `/public/`、`/resources/_gen/`、`/.hugo_build.lock` 放入 `.gitignore`；Pages 工作流会构建 `public/`，不必把它提交进源码仓库。

## 2. 创建 GitHub 仓库

在 GitHub 新建仓库。若希望使用根地址 `https://your-name.github.io/`，仓库名必须是 `your-name.github.io`；若使用项目地址，可以取普通仓库名。已有本地 Git 仓库时，建议创建空仓库，避免首次推送出现不必要的历史合并。

然后在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。本文的工作流会上传构建产物并部署，不使用“从分支发布”的方式。

## 3. 添加 GitHub Actions 工作流

在站点根目录创建 `.github/workflows/hugo.yml`。下面的示例与本站当前流程保持一致：安装 Go 和 Hugo Extended，构建 `public/`，上传 Pages artifact，再由独立的部署任务发布。

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Build
        run: |
          hugo mod get
          hugo --minify

      - name: Check output
        run: test -f public/index.html

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: ./public

  deploy:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

这个示例展示本站当前使用的 action 大版本，不保证未来一直是最新。维护时以 [GitHub Pages 官方工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) 与仓库实际运行记录为准。Go 版本也应与你的项目和主题要求匹配；主题版本由 `go.mod` 固定。若想锁定 Hugo 本身，可把 `hugo-version: 'latest'` 换成已经在本地和 CI 验证的具体版本。

## 4. 推送并确认上线

还没有设置 Git 远程仓库时，按实际用户名和仓库名替换下面的占位符：

```bash
git add .
git commit -m "Set up Hugo Pages deployment"
git branch -M main
git remote add origin https://github.com/your-name/your-name.github.io.git
git push -u origin main
```

如果仓库已有 `origin`，跳过 `git remote add` 并检查 `git remote -v`。推送后在仓库 **Actions** 页面查看最新运行：先确认 Build 成功并生成 `public/index.html`，再确认 Deploy 成功。首次站点可在 **Settings → Pages** 查看最终 URL。

不要用一个固定的“等待几分钟”当作成功标准；以 Actions 的部署结果和线上页面实际打开为准。再检查首页、文章封面、样式和搜索索引 `/index.json`。

## 5. 自定义域名

以 `blog.example.com` 为例，在 **Settings → Pages → Custom domain** 填入此域名并保存。在 DNS 服务商处添加：

```text
类型   CNAME
名称   blog
目标   your-name.github.io
```

然后把 `hugo.toml` 改为 `baseURL = 'https://blog.example.com/'`，提交并推送。等 GitHub 完成域名检查与证书签发后，在 Pages 设置中启用 **Enforce HTTPS**。使用自定义 Actions 工作流时，域名以 Pages 设置为准，不需要依赖仓库中的 `CNAME` 文件。根域名的 DNS 记录与子域名不同，应查阅 [GitHub 的自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

## 6. 日常更新与排错

新文章建议使用 `content/posts/文章名/index.md`，封面放在同目录的 `images/` 下。每次发布先本地预览和构建，再提交、推送：

```bash
hugo server -D
hugo --minify
git add content hugo.toml go.mod go.sum
git commit -m "Add new post"
git push
```

只修改了文章时，可按实际文件缩小 `git add` 范围。若部署失败，从 Actions 日志中找到失败的具体步骤：

| 现象 | 优先检查 |
| --- | --- |
| Build 阶段模块下载失败 | `go.mod`、`go.sum`、网络与模块版本 |
| Hugo 报版本或 SCSS 错误 | Hugo 是否为 Extended，版本是否满足主题要求 |
| Deploy 权限错误 | Pages Source、`pages: write`、`id-token: write` 和 `github-pages` environment |
| 页面有内容但图片 404 | `baseURL`、项目子路径、Page Bundle 文件名大小写 |
| 新文章不显示 | `draft`、发布日期、是否已推送到 `main` |

未来日期的文章不会因为日期到了就自动重新构建；若需要定时发布，另行安排定时触发工作流，并在发布时确认 Hugo 的未来内容选项。平时更新主题时，先在本地运行 `hugo mod get github.com/c-x-x/hugo-theme-imx@版本号`、`hugo mod tidy` 和 `hugo --minify`，确认无误后再提交依赖文件。

至此，每次推送到 `main` 后，工作流都会重新生成并发布站点。

参考：[Hugo 官方 GitHub Pages 部署指南](https://gohugo.io/host-and-deploy/host-on-github-pages/) · [GitHub Pages 发布源说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
