+++
title = "skill和mcp"
slug = "skill-and-mcp"
date = "2026-09-16T11:35:27+08:00"
draft = false
categories = ["知识"]
tags = ["skil", "mcp"]
image = "/posts/skill-and-mcp/images/cover.webp"
description = "skill是什么，mcp又是什么，二者有什么区别，如何使用的。"
featured = true
toc = true
+++
## 什么是**Skill**

**Skill** 理解成给 AI Agent 安装的“可复用专业工作包”

一个典型 Skill 会把某项工作的 **规则、SOP、参考资料、脚本、模板** 打包起来，让 Codex等 Agent 遇到对应任务时知道“应该按照什么流程做”

openai官方的定义：一个独立目录，以 `SKILL.md` 为入口，可以附带脚本、references、assets 等资源

**references**可以理解为“参考资产/知识库”，比如做漫剧

```txt
my-skill/
├── SKILL.md
└── references/
    ├── api-guide.md
    ├── storyboard-rules.md
    ├── character-consistency.md
    └── output-schema.md
```

```txt
处理分镜任务前，读取：
[分镜规范](references/storyboard-rules.md)

涉及角色一致性时，读取：
[角色一致性规则](references/character-consistency.md)
```

这样做的优点是，不需要把几万字规则全写进 `SKILL.md`

**assets**可以理解为“可直接拿来使用的素材或模板”

它不一定是让 Agent 阅读的，很多时候是 **直接复制、修改、输出或作为程序输入**，像是一个可以使用的现成模板

references = 给 AI 看

assets = 给 AI 拿来用

一个完整的skill：

```txt
my-skill/
├── SKILL.md
├── scripts/
│   ├── process.py
│   └── check.py
├── references/
│   ├── workflow.md
│   └── api-guide.md
├── assets/
│   └── template.json
└── agents/
    └── openai.yaml
```

解释：

| 文件 | 作用 | 可以理解成 |
| --- | --- | --- |
| `SKILL.md` | 控制整个 Skill 怎么工作 | 总指挥 |
| `references/` | 提供知识和规则 | 教科书 |
| `assets/` | 提供模板和素材 | 原材料 |
| `scripts/` | 执行确定性程序 | 工具 |
| `agents/openai.yaml` | 产品/UI/依赖配置 | Skill 身份证 |

一句话解释：Skill = 给 Agent 写好的“专业岗位操作手册 + 工具箱”

### 注意

`SKILL.md`整个 Skill 的核心入口

通常至少包含两部分：

```markdown
---
name: my-skill
description: Process input data and generate standardized output.
---

# Instructions

1. Read the input.
2. Read references/workflow.md if needed.
3. Run scripts/process.py.
4. Validate with scripts/check.py.
5. Use assets/template.json as the output structure.
```

name和description十分重要，官方目前明确说明，`name` 和 `description` 是 Codex 判断 Skill 是否应该被使用的主要 metadata，真正的 Markdown 正文是在 Skill 触发后再读取。

## 什么是MCP

MCP ： **Model Context Protocol**

让 AI Agent 以统一方式连接外部工具、数据源和服务的一套协议。

如果前面把 Skill 比作“工作方法”，那 MCP 更像“外接工具接口”。

例如 Codex 本身可能不知道你的 GitHub 私有仓库、Notion、数据库、浏览器、公司内部 API 里的内容。接入对应 MCP 后，Agent 就可以通过标准化接口去读取或操作这些系统

Skill 决定“怎么做”，MCP 决定“能连接什么、能调用什么”。

 **MCP 不是一堆 Markdown 文件**。它更像一套“通信协议 + 服务端程序”

最典型的结构:

```txt
MCP Client
= Codex / Claude / 其他 Agent

MCP Server
= 一个实际运行的程序

两者通过 MCP 协议通信
```

例如一个 GitHub MCP Server，本质上可能是：

```txt
github-mcp-server/
├── package.json
├── src/
│   ├── index.ts
│   ├── tools.ts
│   └── github.ts
└── config.json
```

或者 Python：

```txt
my-mcp/
├── server.py
├── tools.py
└── requirements.txt
```

## skill和mcp的例子

一个知名 Skill：OpenAI 的 `openai-docs` Skill

它位于 OpenAI 官方 `openai/skills` 仓库里，本质上就是一个 Skill 目录，核心入口是 `SKILL.md`。它的职责是：当用户询问 OpenAI API、Codex、模型选择、迁移、官方文档等问题时，告诉 Agent 应该按什么流程查资料、优先调用什么工具、什么时候 fallback 到网页搜索。

大概是：

```txt
openai-docs/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── assets/
```

里面的逻辑类似：

```txt
用户问 OpenAI API
↓
触发 openai-docs Skill
↓
先查官方 OpenAI Docs MCP
↓
拿到当前文档
↓
再按照 Skill 规定的方式回答
```

所以它本身主要是：

> **规则 + 工作流 + 调度说明**

而不是负责真正联网获取文档。



一个知名 MCP：GitHub MCP Server。

这是 GitHub 官方维护的 `github/github-mcp-server`。它是一个真正运行的 MCP Server，可以让 Codex、Claude、Copilot 等 Agent 通过标准 MCP 协议直接操作 GitHub。

他能提供的真实能力:

```txt
读取仓库
搜索代码
读取 commit
读取 PR
创建 issue
修改 issue
评论 PR
查看 GitHub Actions
分析 CI 失败
读取安全扫描结果
```

大概是：

```txt
github-mcp-server/
├── cmd/
├── internal/
├── pkg/
├── server.json
└── ...
```

这是 Go 写的实际服务程序，不是 Markdown 工作流。GitHub 还提供远程 MCP Server，地址通过 MCP 协议暴露给兼容客户端。



### 二者的区别

```txt
openai-docs Skill
        ↓
告诉 Agent：
“遇到 OpenAI 文档问题，先这么查、再这么回答”

GitHub MCP Server
        ↓
告诉 Agent：
“我这里真的有工具，你可以读取 PR、创建 Issue、查仓库”
```

另外`openai-docs` Skill 本身就是 **Skill + MCP 联动** 的案例

它的 `agents/openai.yaml` 明确声明依赖 `openaiDeveloperDocs` MCP Server：

```txt
OpenAI Docs Skill
        │
        │ 规定怎么做
        ↓
OpenAI Developer Docs MCP
        │
        │ 真正查询官方文档
        ↓
developers.openai.com
```

### 总结

| 项目 | Skill | MCP |
| --- | --- | --- |
| 本质 | 一套可复用的任务方法 / SOP | 一套让 AI 连接外部工具和服务的协议 |
| 主要形式 | `SKILL.md` + references/assets/scripts | 一个运行中的 MCP Server |
| 主要作用 | 告诉 Agent“怎么做” | 给 Agent“真正可调用的能力” |
| 是否主要是 Markdown | 是 | 不是 |
| 是否需要运行程序 | 不一定 | 通常需要 |
| 是否能调用外部系统 | 本身通常不能 | 可以 |
| 典型内容 | 工作流、规范、步骤、模板 | `search_repo()`、`query_db()`、`create_issue()` |
| 代表例子 | OpenAI `openai-docs` Skill | GitHub MCP Server |



可以这么理解：

```txt
Skill = 方法
MCP = 工具
Agent = 执行者
```

举例：

```txt
用户：
“检查这个 GitHub PR”

        ↓

Skill：
告诉 Agent
1. 先看 diff
2. 再看测试
3. 检查安全问题
4. 输出 Review

        ↓

MCP：
真正提供
- 读取 PR
- 获取 diff
- 获取评论
- 提交评论

        ↓

Agent / Codex
综合执行
```