# LinuxDoSave

这是一个用于 `linux.do` 的 Tampermonkey 用户脚本仓库，用来一键提取主贴 Markdown 源码，并支持复制、下载、快捷键下载等能力。

当前主脚本为 `LinuxDoSave.user.js`，仓库历史已按 `a` 到 `f` 六个阶段整理为独立 Git 提交与标签，方便回看每次功能演进。

## 当前版本

- 文件：`LinuxDoSave.user.js`
- 对应标签：`f`
- 当前脚本版本：`3.5`

## 功能概览

当前 `f` 版本支持：

- 在 `linux.do` 帖子页注入复制按钮和下载按钮
- 一键复制：`标题 + URL + Markdown 源码`
- 下载为 `.md` 文件
- 快捷键 `Ctrl+S` / `Cmd+S` 触发下载
- 修复帖子源码里的 `upload://...` 图片链接
- 兼容站内 SPA 路由切换后重新注入按钮

## 安装方式

1. 安装浏览器扩展 `Tampermonkey`
2. 打开 `LinuxDoSave.user.js`
3. 新建脚本并粘贴内容，或直接导入
4. 访问 `https://linux.do/` 的帖子页测试

## 仓库结构

- `LinuxDoSave.user.js`：当前最新版脚本
- `a.js` ~ `f.js`：各阶段原始版本快照，便于人工对照
- `README.md`：仓库说明

## 版本演进

### a

- 标签：`a`
- 提交：`1f961c4`
- 文件：`a.js`
- 说明：初版脚本，核心目标是将页面内容转成 Markdown 并下载

### b

- 标签：`b`
- 提交：`6946d68`
- 文件：`b.js`
- 说明：思路改为直接读取 Discourse 原始接口，在主贴区域增加“复制源码”按钮

### c

- 标签：`c`
- 提交：`5cf4b35`
- 文件：`c.js`
- 说明：复制内容升级为“帖子标题 + Markdown 源码”

### d

- 标签：`d`
- 提交：`5a792b6`
- 文件：`d.js`
- 说明：新增下载按钮，并支持 `Ctrl+S` / `Cmd+S` 快捷键下载 Markdown 文件

### e

- 标签：`e`
- 提交：`d43c9cc`
- 文件：`e.js`
- 说明：复制与下载内容增加帖子 URL，并补上 `upload://` 图片链接修复

### f

- 标签：`f`
- 提交：`f0b3137`
- 文件：`f.js`
- 说明：放宽脚本匹配范围到全站，并增加对单页应用路由切换的监听，确保跳转帖子后仍能自动注入按钮

## 查看历史

查看完整提交历史：

```bash
git log --oneline --decorate --reverse
```

切换到某个版本：

```bash
git checkout a
git checkout b
git checkout c
git checkout d
git checkout e
git checkout f
```

切回最新版：

```bash
git checkout main
```

## 说明

- 现在仓库历史是按版本演进人工整理出来的，不是当时真实逐步开发时的原始 Git 历史
- `a.js` 到 `f.js` 作为本地版本素材保留，主线开发文件是 `LinuxDoSave.user.js`
