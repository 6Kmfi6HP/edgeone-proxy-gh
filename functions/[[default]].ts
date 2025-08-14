interface GeoProperties {
  asn: number;
  countryName: string;
  countryCodeAlpha2: string;
  countryCodeAlpha3: string;
  countryCodeNumeric: string;
  regionName: string;
  regionCode: string;
  cityName: string;
  latitude: number;
  longitude: number;
  cisp: string;
}

interface IncomingRequestEoProperties {
  geo: GeoProperties;
  uuid: string;
  clientIp: string;
}

interface EORequest extends Request {
  readonly eo: IncomingRequestEoProperties;
}

// 处理 OPTIONS 预检请求
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// 解析并验证 GitHub URL
function parseGitHubUrl(urlStr: string): { hostname: string; path: string; isValid: boolean } {
  // 支持的 GitHub 域名
  const supportedDomains = [
    'github.com',
    'raw.githubusercontent.com',
    'gist.github.com',
    'gist.githubusercontent.com',
    'codeload.github.com',
    'objects.githubusercontent.com'
  ];

  try {
    // 处理两种 URL 格式：
    // 1. 直接的 GitHub URL
    // 2. 代理格式 https://ghfast.top/https://github.com/...
    let targetUrl: string;
    
    if (urlStr.includes('/https://') || urlStr.includes('/http://')) {
      // 提取嵌入的 URL
      const match = urlStr.match(/https?:\/\/[^\/]+\/(https?:\/\/.+)/);
      if (match && match[1]) {
        targetUrl = match[1];
      } else {
        return { hostname: '', path: '', isValid: false };
      }
    } else {
      // 假设路径部分就是 GitHub 路径
      const url = new URL(urlStr);
      const pathParts = url.pathname.split('/').filter(p => p);
      
      // 如果路径看起来像 GitHub 路径，构造完整 URL
      if (pathParts.length >= 2) {
        targetUrl = `https://github.com${url.pathname}${url.search}`;
      } else {
        return { hostname: '', path: '', isValid: false };
      }
    }

    const parsedUrl = new URL(targetUrl);
    const hostname = parsedUrl.hostname;
    
    // 验证是否为支持的 GitHub 域名
    if (!supportedDomains.includes(hostname)) {
      return { hostname: '', path: '', isValid: false };
    }

    return {
      hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      isValid: true
    };
  } catch {
    return { hostname: '', path: '', isValid: false };
  }
}

// 处理 git clone 请求的特殊路径
function handleGitClonePath(path: string, hostname: string): { hostname: string; path: string } {
  // git clone 相关的路径模式
  const gitPatterns = [
    /^\/.*\.git$/,
    /^\/.*\.git\/(info|HEAD|objects|refs)/,
    /^\/.*\/info\/refs$/,
    /^\/.*\/git-upload-pack$/,
    /^\/.*\/git-receive-pack$/
  ];

  // 检查是否匹配 git 相关路径
  const isGitPath = gitPatterns.some(pattern => pattern.test(path));
  
  if (isGitPath && hostname === 'github.com') {
    // 对于 git 操作，保持使用 github.com
    return { hostname: 'github.com', path };
  }

  // 处理 archive 下载（zip/tar.gz）
  if (path.includes('/archive/')) {
    return { hostname: 'codeload.github.com', path };
  }

  // 处理 releases 下载
  if (path.includes('/releases/download/')) {
    return { hostname: 'github.com', path };
  }

  return { hostname, path };
}

// 创建首页 HTML
function createHomePage(): Response {
  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub 文件加速下载</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 800px;
      width: 100%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .input-group {
      display: flex;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 10px;
      overflow: hidden;
    }
    input {
      flex: 1;
      padding: 15px 20px;
      border: none;
      font-size: 16px;
      outline: none;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 16px;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    button:hover { opacity: 0.9; }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      color: #333;
      font-size: 1.3em;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    .example-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    .code {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      overflow-x: auto;
      margin: 10px 0;
    }
    .supported-list {
      list-style: none;
      padding: 0;
    }
    .supported-list li {
      padding: 8px 0;
      color: #555;
    }
    .supported-list li:before {
      content: "✓ ";
      color: #667eea;
      font-weight: bold;
      margin-right: 8px;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 GitHub 加速下载</h1>
    <p class="subtitle">为终端命令行和浏览器提供 GitHub 文件加速服务</p>
    
    <div class="input-group">
      <input type="text" id="urlInput" placeholder="输入 GitHub 链接（如: https://github.com/user/repo/archive/master.zip）">
      <button onclick="downloadFile()">下载</button>
    </div>

    <div class="section">
      <h2 class="section-title">📋 支持的链接格式</h2>
      <ul class="supported-list">
        <li>Raw 文件: raw.githubusercontent.com</li>
        <li>Gist: gist.github.com, gist.githubusercontent.com</li>
        <li>分支源码: /archive/master.zip</li>
        <li>Releases 源码: /archive/refs/tags/vX.X.X.zip</li>
        <li>Releases 文件: /releases/download/vX.X.X/file.tar.gz</li>
      </ul>
    </div>

    <div class="section">
      <h2 class="section-title">🖥️ 终端使用示例</h2>
      
      <div class="example-box">
        <strong>Git Clone</strong>
        <div class="code">git clone ${location.origin}/https://github.com/user/repo.git</div>
      </div>

      <div class="example-box">
        <strong>Git Clone 私有仓库</strong>
        <div class="code">git clone https://username:token@${location.host}/https://github.com/user/private-repo.git</div>
      </div>

      <div class="example-box">
        <strong>Wget 下载</strong>
        <div class="code">wget ${location.origin}/https://github.com/user/repo/archive/master.zip</div>
      </div>

      <div class="example-box">
        <strong>Curl 下载</strong>
        <div class="code">curl -O ${location.origin}/https://raw.githubusercontent.com/user/repo/main/file.txt</div>
      </div>
    </div>

    <div class="warning">
      <strong>⚠️ 注意事项</strong>
      <ul style="margin-top: 10px; padding-left: 20px;">
        <li>不支持 SSH Key 方式的 git clone</li>
        <li>私有仓库需要使用 Personal Access Token</li>
        <li>请合理使用，避免滥用</li>
      </ul>
    </div>
  </div>

  <script>
    function downloadFile() {
      const url = document.getElementById('urlInput').value.trim();
      if (!url) {
        alert('请输入 GitHub 链接');
        return;
      }
      
      // 构造代理 URL
      let proxyUrl;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        proxyUrl = location.origin + '/' + url;
      } else {
        proxyUrl = location.origin + '/https://' + url;
      }
      
      // 打开新窗口下载
      window.open(proxyUrl, '_blank');
    }
    
    // 支持回车键下载
    document.getElementById('urlInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        downloadFile();
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    }
  });
}

// 处理所有请求
export async function onRequest({ request }: { request: EORequest }) {
  const url = new URL(request.url);
  
  // 如果是访问首页，返回 HTML 界面
  if (url.pathname === '/' && request.method === 'GET') {
    return createHomePage();
  }

  // 解析目标 GitHub URL
  const githubInfo = parseGitHubUrl(request.url);
  
  if (!githubInfo.isValid) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid GitHub URL',
        message: 'Please provide a valid GitHub URL',
        example: `${url.origin}/https://github.com/user/repo`
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  // 处理 git clone 特殊路径
  const gitPath = handleGitClonePath(githubInfo.path, githubInfo.hostname);
  
  // 构造目标 URL
  const targetUrl = `https://${gitPath.hostname}${gitPath.path}`;

  // 准备请求头
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('Accept-Encoding');
  
  // 保留认证信息（用于私有仓库）
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    // 检查 URL 中是否包含认证信息（user:token@）
    const urlAuth = url.pathname.match(/https:\/\/([^:]+):([^@]+)@/);
    if (urlAuth) {
      const [, user, token] = urlAuth;
      headers.set('Authorization', `Basic ${btoa(`${user}:${token}`)}`);
    }
  }

  // 设置 User-Agent
  if (!headers.get('User-Agent')) {
    headers.set('User-Agent', 'Mozilla/5.0 (compatible; GitHub-Proxy/1.0)');
  }

  // 处理请求体
  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  try {
    // 发起请求
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'follow',
    });

    // 创建响应
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // 添加 CORS 头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 对于某些内容类型，设置合适的 Content-Disposition
    const contentType = response.headers.get('Content-Type');
    if (contentType && (contentType.includes('application/zip') || 
                        contentType.includes('application/x-gzip') ||
                        contentType.includes('application/octet-stream'))) {
      const filename = gitPath.path.split('/').pop() || 'download';
      newResponse.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return newResponse;
  } catch (e: any) {
    return new Response(
      JSON.stringify({ 
        error: e?.message || String(e), 
        url: targetUrl,
        timestamp: new Date().toISOString()
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
