# Hugo 博客文件结构与部署流程详解

## 📁 一、推送到 GitHub 的文件（源代码）

### 1. 核心配置文件

#### `hugo.toml`
**作用**：Hugo 的主配置文件
**内容**：
- 网站基本信息（标题、URL、语言）
- 主题设置
- 参数配置（作者、描述、社交链接）
- Markdown 渲染配置
- 评论系统配置（Giscus）

**生成方式**：手动创建和编辑

```toml
baseURL = 'https://blog.cxx.pub/'
title = 'IMXBlog'
theme = 'imx-theme'

[params]
  author = 'IMX'
  description = '技术博客'
```

---

#### `.gitignore`
**作用**：告诉 Git 哪些文件不要提交到仓库
**内容**：
- `/public/` - Hugo 构建生成的静态网站（不提交源码仓库）
- `node_modules/` - Node.js 依赖
- `.DS_Store` - macOS 系统文件

**为什么 public/ 不提交？**
- `public/` 是 Hugo 构建的**输出结果**，不是源代码
- 每次构建都会重新生成，提交它会污染 Git 历史
- GitHub Actions 会在云端重新构建，不需要提交构建产物

**生成方式**：手动创建

---

### 2. 内容文件

#### `content/` 目录
**作用**：存放所有文章和页面的 Markdown 源文件

**结构**：
```
content/
├── about.md                              # 关于页面
└── posts/                                # 文章目录
    ├── claude-code-tutorial.md          # 文章 1
    ├── hugo-imx-theme-tutorial.md       # 文章 2
    └── github-pages-deployment-guide.md # 文章 3
```

**文章格式**：
```markdown
+++
title = "文章标题"
date = 2026-06-13
draft = false
tags = ["标签1", "标签2"]
categories = ["分类"]
image = "/images/posts/cover.svg"
+++

## 文章内容

这里是正文...
```

**Front Matter（头部元数据）**：
- `title` - 文章标题
- `date` - 发布日期
- `draft` - 是否为草稿（true 不会发布）
- `tags` - 标签
- `categories` - 分类
- `image` - 封面图片路径

**生成方式**：
- 手动创建：直接创建 `.md` 文件
- Hugo 命令：`hugo new posts/article-name.md`

---

#### `static/` 目录
**作用**：存放静态资源（图片、字体、文件等）

**结构**：
```
static/
└── images/
    └── posts/
        ├── hugo-imx-theme.svg
        ├── claude-code.svg
        └── github-pages-deploy.svg
```

**特点**：
- `static/` 下的文件会**原样复制**到网站根目录
- `static/images/posts/cover.jpg` → 网站中的 `/images/posts/cover.jpg`
- 不经过任何处理，直接可访问

**生成方式**：手动创建和添加

---

### 3. 主题文件

#### `themes/imx-theme/` 目录
**作用**：自定义主题，控制网站的外观和布局

**结构**：
```
themes/imx-theme/
├── archetypes/
│   └── default.md              # 新文章模板
├── assets/
│   ├── css/
│   │   └── main.css           # 样式表
│   └── js/
│       └── main.js            # JavaScript
├── layouts/
│   ├── _default/
│   │   ├── baseof.html        # 基础模板
│   │   ├── single.html        # 文章页面模板
│   │   ├── list.html          # 列表页面模板
│   │   └── index.json         # 搜索索引模板
│   ├── index.html             # 首页模板
│   └── partials/
│       ├── header.html        # 页头组件
│       ├── footer.html        # 页尾组件
│       └── comments.html      # 评论组件
└── theme.toml                 # 主题配置
```

**各文件作用**：

**CSS (`assets/css/main.css`)**：
- 定义网站样式（颜色、字体、布局）
- Claude 官网风格
- 深色/浅色主题
- 响应式设计

**JavaScript (`assets/js/main.js`)**：
- 主题切换
- 目录高亮
- 移动端菜单

**HTML 模板 (`layouts/`)**：
- `baseof.html` - 基础框架（<html>, <head>, <body>）
- `single.html` - 单篇文章的布局
- `list.html` - 文章列表布局
- `index.html` - 首页布局
- `header.html` - 导航栏
- `footer.html` - 页脚
- `comments.html` - Giscus 评论

**生成方式**：手动创建和编辑

---

### 4. GitHub Actions 配置

#### `.github/workflows/hugo.yml`
**作用**：自动化部署配置文件

**完整内容**：
```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches:
      - main          # 推送到 main 分支时触发
  workflow_dispatch:  # 允许手动触发

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Build
        run: hugo --minify
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

**生成方式**：手动创建

---

### 5. 其他文件

#### `archetypes/default.md`
**作用**：新文章的默认模板

#### `.hugo_build.lock`
**作用**：Hugo 构建时的锁文件，防止并发构建冲突

---

## ⚙️ 二、GitHub Actions 工作流详解

### 整体流程图

```
你的电脑 (本地)                    GitHub (远程)                    GitHub Pages (部署)
┌──────────────┐                  ┌─────────────┐                 ┌──────────────┐
│              │                  │             │                 │              │
│  编写文章    │  git push       │   GitHub    │  触发 Actions   │  构建 Hugo   │
│  *.md 文件   │ ───────────────>│   仓库      │ ──────────────>│  生成 HTML   │
│              │                  │   (源码)    │                 │              │
│  themes/     │                  │             │                 │  public/     │
│  hugo.toml   │                  │             │                 │  ├─index.html│
│              │                  │             │                 │  ├─posts/    │
└──────────────┘                  └─────────────┘                 │  └─css/      │
                                                                  │              │
                                                                  │  部署到      │
                                                                  │  Pages       │
                                                                  └──────────────┘
```

---

### 工作流步骤详解

#### 步骤 1：触发条件

```yaml
on:
  push:
    branches:
      - main
```

**触发时机**：
- 当你执行 `git push` 推送代码到 `main` 分支时
- 自动开始运行工作流

**你推送的内容**：
- 文章源文件（`.md`）
- 主题文件（HTML、CSS、JS）
- 配置文件（`hugo.toml`）
- 静态资源（图片）

---

#### 步骤 2：检出代码

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

**作用**：
- 从 GitHub 仓库下载你推送的源代码
- 到 GitHub 的虚拟服务器（Ubuntu Linux）

**下载的内容**：
- 整个仓库的所有文件
- 包括 `content/`、`themes/`、`hugo.toml` 等

---

#### 步骤 3：安装 Hugo

```yaml
- name: Setup Hugo
  uses: peaceiris/actions-hugo@v2
  with:
    hugo-version: 'latest'
    extended: true
```

**作用**：
- 在 GitHub 服务器上安装 Hugo 工具
- `extended: true` 表示安装扩展版（支持 SCSS、WebP 等）

**Hugo 是什么？**
- 静态网站生成器
- 把 Markdown 文件转换成 HTML 网站

---

#### 步骤 4：构建网站

```yaml
- name: Build
  run: hugo --minify
```

**这一步做了什么？**

1. **读取配置** (`hugo.toml`)
   - 知道网站标题、URL、主题

2. **读取内容** (`content/`)
   - 扫描所有 `.md` 文章
   - 解析 Front Matter（标题、日期、标签）
   - 转换 Markdown 为 HTML

3. **应用主题** (`themes/imx-theme/`)
   - 使用 HTML 模板渲染页面
   - 处理 CSS 样式
   - 合并 JavaScript

4. **处理静态资源** (`static/`)
   - 复制图片、字体等文件

5. **生成静态网站** → `public/` 目录
   ```
   public/
   ├── index.html              # 首页
   ├── posts/
   │   ├── index.html         # 文章列表页
   │   ├── article-1/
   │   │   └── index.html     # 文章 1 页面
   │   └── article-2/
   │       └── index.html     # 文章 2 页面
   ├── categories/
   │   └── index.html         # 分类页面
   ├── tags/
   │   └── index.html         # 标签页面
   ├── css/
   │   └── main.min.css       # 压缩后的 CSS
   ├── js/
   │   └── main.min.js        # 压缩后的 JS
   ├── images/
   │   └── posts/             # 图片
   └── index.json             # 搜索索引
   ```

6. **`--minify` 优化**
   - 压缩 HTML（删除空格、换行）
   - 压缩 CSS（删除注释）
   - 压缩 JavaScript
   - 减小文件体积，加快加载速度

**构建前后对比**：

**构建前（源码）**：
```markdown
## 标题
这是一段文字
```

**构建后（HTML）**：
```html
<h2 id="标题">标题</h2>
<p>这是一段文字</p>
```

---

#### 步骤 5：上传构建产物

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./public
```

**作用**：
- 把 `public/` 目录打包成压缩文件
- 上传到 GitHub 的临时存储
- 供下一步部署使用

**上传的内容**：
- 所有生成的 HTML 文件
- 所有 CSS、JS 文件
- 所有图片和静态资源

---

#### 步骤 6：部署到 GitHub Pages

```yaml
- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

**作用**：
- 从临时存储下载构建产物
- 发布到 GitHub Pages 服务器
- 网站变为可访问状态

**部署到哪里？**
- `https://c-x-x.github.io/`
- 或自定义域名 `https://blog.cxx.pub/`

---

### 完整的数据流

```
1. 本地编写
   content/posts/article.md (Markdown 源文件)
   ↓
   
2. 推送到 GitHub
   git push
   ↓
   
3. GitHub Actions 触发
   检出代码到虚拟服务器
   ↓
   
4. 安装 Hugo
   在虚拟服务器上安装 Hugo 工具
   ↓
   
5. 构建网站
   hugo --minify
   ├─ 读取 hugo.toml
   ├─ 读取 content/*.md
   ├─ 应用 themes/imx-theme/
   ├─ 渲染 HTML 模板
   ├─ 处理 CSS/JS
   └─ 生成 public/ 目录
   ↓
   
6. 上传构建产物
   public/ → GitHub 临时存储
   ↓
   
7. 部署到 Pages
   public/ → GitHub Pages 服务器
   ↓
   
8. 用户访问
   https://c-x-x.github.io/
```

---

## 🔄 三、为什么需要 GitHub Actions？

### 传统方式（不使用 Actions）

```bash
# 在本地构建
hugo --minify

# 提交 public/ 到仓库
git add public/
git commit -m "Build"
git push
```

**问题**：
- 需要手动构建
- `public/` 包含大量文件，污染 Git 历史
- 每次修改都要重新构建和提交
- 协作时容易冲突

---

### 使用 GitHub Actions（自动化）

```bash
# 只需提交源码
git add content/posts/article.md
git commit -m "Add: 新文章"
git push

# GitHub Actions 自动完成：
# ✅ 安装 Hugo
# ✅ 构建网站
# ✅ 部署到 Pages
```

**优势**：
- ✅ 完全自动化，无需手动构建
- ✅ 只提交源码，Git 历史干净
- ✅ 云端构建，不占用本地资源
- ✅ 统一的构建环境，避免"在我机器上能跑"
- ✅ 构建失败有详细日志，方便排查

---

## 📊 四、文件大小对比

### 提交到 GitHub 的源码（你推送的）

```
content/posts/*.md           ~50 KB    (文章源文件)
themes/imx-theme/            ~200 KB   (主题文件)
static/images/               ~100 KB   (图片)
hugo.toml                    ~2 KB     (配置)
.github/workflows/hugo.yml   ~1 KB     (Actions 配置)
─────────────────────────────────────
总计                         ~350 KB
```

### 构建后的网站（Actions 生成的）

```
public/                      ~2 MB     (完整的静态网站)
├── HTML 文件                ~500 KB
├── CSS/JS                   ~300 KB
├── 图片                     ~1 MB
└── 其他资源                 ~200 KB
```

**你只需管理 350 KB 的源码，Actions 帮你生成 2 MB 的网站！**

---

## 🎯 五、总结

### 你推送什么？

1. **文章** - Markdown 源文件
2. **主题** - HTML/CSS/JS 模板
3. **配置** - hugo.toml
4. **图片** - static/ 下的资源
5. **Actions 配置** - .github/workflows/hugo.yml

### GitHub Actions 做什么？

1. **接收你的代码**
2. **安装 Hugo 工具**
3. **构建静态网站** (Markdown → HTML)
4. **部署到 GitHub Pages**

### 最终用户看到什么？

- 完整的 HTML 网站
- 在 `https://c-x-x.github.io/` 访问
- 无需服务器，完全静态

### 核心理念

**分离源码和构建产物**：
- 源码（Markdown）→ 提交到 Git
- 构建产物（HTML）→ 自动生成，不提交

**就像编程语言**：
- 源代码（`.c`）→ 提交到 Git
- 可执行文件（`.exe`）→ 编译生成，不提交

**Hugo 博客也是如此**：
- Markdown 文章 → 提交到 Git
- HTML 网站 → Hugo 构建，不提交

---

这就是整个 Hugo + GitHub Actions 的完整工作流程！🚀
