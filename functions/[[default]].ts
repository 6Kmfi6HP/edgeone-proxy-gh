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


// 处理所有请求（除了根路径，根路径由 index.ts 处理）
export async function onRequest({ request }: { request: EORequest }) {
  const url = new URL(request.url);
  
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
    
    // 禁止搜索引擎索引代理内容
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');

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
