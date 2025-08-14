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
    },
  });
}

// 处理所有请求
export async function onRequest({ request }: { request: EORequest }) {
  // 处理 URL
  const url = new URL(request.url);
  url.hostname = "cdn.jsdelivr.net"; // 此处替换为要反代的域名

  // 请求头处理，去除可能导致错误的 headers
  const headers = new Headers(request.headers);
  // 如果不知道有什么，可以取消注释以下内容：
  // return new Response(JSON.stringify(headers));
  headers.delete("host");
  headers.delete("Accept-Encoding");
  
  // 请求体处理，仅在允许的情况下传递 body
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // 生成回源请求
  const req = new Request(url.toString(), {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "follow",
  });

  try {
    // 发起请求，返回只读属性的响应
    const response = await fetch(req);

    // 拷贝响应，方便后续修改
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // 处理响应头
    newResponse.headers.set("Access-Control-Allow-Origin", "*");

    // 返回响应
    return newResponse;
  } catch (e: any) {
    // 返回错误
    return new Response(
      JSON.stringify({ error: e?.message || String(e), url: url.toString() }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
