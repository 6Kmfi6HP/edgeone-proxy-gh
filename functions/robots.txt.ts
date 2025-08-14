// 处理 robots.txt 请求
export async function onRequest() {
  const robotsTxt = `User-agent: *
Disallow: /

# 禁止所有搜索引擎索引
# GitHub 代理服务，不应被搜索引擎索引
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=86400', // 缓存1天
    }
  });
}