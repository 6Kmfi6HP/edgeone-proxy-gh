# GitHub 文件加速代理

基于 EdgeOne Pages Function 的 GitHub 文件下载加速服务，支持终端命令行和浏览器下载。

## 功能特点

- 🚀 **加速下载** - 通过 EdgeOne 边缘节点加速 GitHub 文件访问
- 🖥️ **命令行支持** - 支持 `git clone`、`wget`、`curl` 等工具
- 🔐 **私有仓库** - 支持使用 Personal Access Token 访问私有仓库
- 🌐 **多域名支持** - 支持 `github.com`、`raw.githubusercontent.com`、`gist.github.com` 等
- 📋 **友好界面** - 提供可视化的下载界面

## 支持的域名

- `github.com` - 仓库源码、Releases 等
- `raw.githubusercontent.com` - 原始文件
- `gist.github.com` / `gist.githubusercontent.com` - Gist 代码片段
- `codeload.github.com` - 源码包下载

## 使用方法

### 浏览器使用

访问部署后的域名，通过网页界面输入 GitHub 链接进行下载。

### 终端命令行

#### Git Clone

```bash
# 公开仓库
git clone https://your-domain.com/https://github.com/user/repo.git

# 私有仓库（需要 Personal Access Token）
git clone https://username:token@your-domain.com/https://github.com/user/private-repo.git
```

#### Wget 下载

```bash
# 下载分支源码
wget https://your-domain.com/https://github.com/user/repo/archive/master.zip

# 下载 Raw 文件
wget https://your-domain.com/https://raw.githubusercontent.com/user/repo/main/README.md

# 下载 Releases 文件
wget https://your-domain.com/https://github.com/user/repo/releases/download/v1.0.0/file.tar.gz
```

#### Curl 下载

```bash
# 下载文件
curl -O https://your-domain.com/https://github.com/user/repo/archive/master.zip

# 下载 Raw 文件
curl -O https://your-domain.com/https://raw.githubusercontent.com/user/repo/main/file.txt
```

## 私有仓库访问

对于私有仓库，需要在 GitHub 创建 Personal Access Token：

1. 访问 [GitHub Settings - Personal Access Tokens](https://github.com/settings/tokens)
2. 生成新的 Token，选择适当的权限
3. 在 URL 中使用格式：`https://username:token@your-domain.com/https://github.com/...`

## 部署

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产部署

EdgeOne 支持直接部署 TypeScript 文件：

1. 将 `functions/` 文件夹和 `edgeone.json` 上传到 EdgeOne Pages
2. 或使用 Git 仓库自动部署

## 注意事项

- ⚠️ 不支持 SSH Key 方式的 git clone
- ⚠️ 私有仓库必须使用 Personal Access Token
- ⚠️ 请合理使用，避免滥用服务

## 技术实现

- 基于 EdgeOne Pages Functions
- TypeScript 开发，支持类型检查
- 智能路径识别和域名路由
- 完整的错误处理和日志记录

## 相关文档

- [EdgeOne Pages 路由 API](https://edgeone.ai/document/162227908259442688)
- [Fetch API 回源配置](https://edgeone.ai/document/52687)
- [edgeone.json 配置](https://edgeone.ai/document/162316940304400384)