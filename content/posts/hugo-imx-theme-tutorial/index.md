+++
title = 'Hugo 博客搭建与 IMX 主题完全使用指南'
date = 2026-07-07T10:00:00+08:00
lastmod = 2026-09-26T12:00:00+08:00
draft = false
categories = ['技术', '教程']
tags = ['Hugo', 'IMX Theme', '博客搭建', 'Hugo Module']
image = '/posts/hugo-imx-theme-tutorial/images/cover-v2.webp'
description = '从安装 Hugo Extended、创建站点，到用 IMX 写第一篇文章、管理图片与本地预览的一条完整入门路线。'
toc = true
+++

这篇指南带你从空目录走到一个能本地预览的 IMX 博客。完成后，你会知道站点文件放在哪里、怎样写文章，以及修改后该检查什么。已有 Hugo 站点的读者可以直接看 [IMX 主题配置指南](/posts/hugo-theme-imx-configuration-guide/)；准备上线时再看 [GitHub Pages 部署指南](/posts/github-pages-deployment-guide/)。

![从纸页延伸为博客页面的 IMX 主题概念图](images/cover-v2.webp)

## 开始前需要什么

安装 Git、Go 和 **Hugo Extended**。IMX 通过 Hugo Module 加载，主题示例站给出的最低要求是 Hugo Extended 0.112.0 与 Go 1.20；新项目建议让本地与 CI 使用经过验证的相同版本。

```bash
hugo version
go version
git --version
```

确认 `hugo version` 的输出包含 `extended`。建站和写作不需要安装 Node.js；主题仓库里的前端测试依赖只用于维护主题。

## 1. 创建站点并安装主题

以下以 `my-blog` 为目录名，`your-name` 为 GitHub 用户名。请替换这两个占位符。

```bash
hugo new site my-blog
cd my-blog
git init
hugo mod init github.com/your-name/my-blog
```

在根目录的 `hugo.toml` 写入最小配置：

```toml
baseURL = 'https://your-name.github.io/'
defaultContentLanguage = 'zh-cn'
locale = 'zh-CN'
title = '我的博客'

[params]
  description = '记录技术与生活'
  subtitle = '把值得记住的事写下来'
  author = '你的名字'
  mainSections = ['posts']

[outputs]
  home = ['HTML', 'RSS', 'JSON']

[module]
  [module.hugoVersion]
    extended = true
    min = '0.112.0'
  [[module.imports]]
    path = 'github.com/c-x-x/hugo-theme-imx'
```

安装一个明确的主题版本。例如，本站当前使用 `v1.5.6`：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@v1.5.6
hugo mod tidy
```

把 `go.mod`、`go.sum` 一起提交。它们让其他电脑和部署环境使用相同的主题依赖。正式站点不要直接复制主题示例站的 `go.mod`：其中面向主题开发的本地 `replace` 路径，离开主题仓库便不能使用。

## 2. 建立内容目录

建议从下面的结构开始，图片与所属文章放在同一个 Page Bundle 中：

```text
my-blog/
├── content/
│   ├── _index.md
│   ├── about/index.md
│   └── posts/
│       ├── _index.md
│       └── hello-imx/
│           ├── index.md
│           └── images/cover.webp
├── static/images/       # 头像等全站共用图片
├── go.mod
├── go.sum
└── hugo.toml
```

`content/posts/_index.md` 可以只写 `+++`、`title = '文章'`、`+++` 三行。新建 `content/posts/hello-imx/index.md`：

```md
+++
title = '你好，IMX'
date = 2026-09-26T10:00:00+08:00
draft = false
description = '我的第一篇 IMX 文章。'
categories = ['随笔']
tags = ['Hugo', '写作']
image = '/posts/hello-imx/images/cover.webp'
toc = true
+++

这里写文章正文。一级标题已经由主题显示，从二级标题开始组织内容。

## 为什么写这篇文章

这里继续写。
```

Page Bundle 的正文图片用 `![说明](images/cover.webp)` 这样的相对路径；Front Matter 的 `image` 使用发布后的公开路径。封面文件应真实存在，否则列表卡片和分享图可能出现 404。`draft = true` 的文章不会进入常规构建；本地可用 `hugo server -D` 查看。未来日期的文章默认也不会发布。

## 3. 配置首页、关于页与评论

IMX 从 `[params]` 读取站点描述、作者、头像等信息。把头像放到 `static/images/avatar.webp`，然后**在已有的** `[params]` 表中增加 `avatar = '/images/avatar.webp'`。不要在同一个 TOML 文件里重复写第二个 `[params]` 表。

关于页建议使用 `content/about/index.md`，并在 Front Matter 设置 `layout = 'about'`。头像由主题模板读取 `params.avatar`，无需在关于页正文再插入一张大图。

评论由 Giscus 提供。先在 [giscus.app](https://giscus.app/zh-CN) 为自己的 GitHub Discussions 仓库生成 `repoId` 和 `categoryId`，再填入 `[params.giscus]`；不要照抄别人的 ID。搜索需要首页生成 JSON，因此上面的 `[outputs].home` 必须包含 `JSON`。

Logo、菜单、社交链接、深浅色图片和 Markdown 渲染选项的完整字段，请继续看 [主题配置指南](/posts/hugo-theme-imx-configuration-guide/)。

## 4. 本地预览与检查

```bash
hugo server -D
```

打开终端给出的本地地址，依次查看首页、文章页和关于页。确认封面加载、目录跳转、搜索结果与手机宽度的排版。正式构建再执行：

```bash
hugo --minify
```

生成文件位于 `public/`。不要手工修改它；源文件始终放在 `content/`、`static/`、`assets/` 或站点配置中。可将 `/public/`、`/resources/_gen/` 和 `/.hugo_build.lock` 加入 `.gitignore`。

如果主题没有生效，先检查 `hugo version`、`go.mod` 和 `[module.imports]`；如果文章没出现，检查 `draft` 与 `date`；如果图片 404，核对文件名大小写与发布后的 URL。修好后重新运行 `hugo --minify`。

## 下一步

至此，博客已能在本地预览。接下来按 [GitHub Pages 部署指南](/posts/github-pages-deployment-guide/) 配置工作流、推送仓库，再把线上域名填回 `baseURL`。
