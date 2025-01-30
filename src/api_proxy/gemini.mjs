
async function handleGeminiAPIRequest(req) {
	try {

	  if (req.method === "OPTIONS") {
      return handleOPTIONS();
    }
		const url = new URL(req.url);
		const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;

		// 创建新的请求头，保留原始请求的相关头信息
		const headers = new Headers(req.headers);

		headers.delete('origin')

		// 创建新的请求
		console.log('targetUrl => ', targetUrl)
		const proxyReq = new Request(targetUrl, {
			method: req.method,
			headers: headers,
			body: req.body,
			redirect: 'follow',
		});

		// 发送请求到 Gemini API
		const response = await fetch(proxyReq);

		// 非流式响应直接返回
		return new Response(response.body, fixCors(response));

	} catch (error) {
		console.error('Gemini API request error:', error);
		const errorMessage = error instanceof Error ? error.message : '未知错误';
		return new Response(errorMessage, {
			status: 500,
			headers: {
				'content-type': 'text/plain;charset=UTF-8',
			}
		});
	}
}


const handleOPTIONS = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    }
  });
};

const fixCors = ({ headers, status, statusText }) => {
  headers = new Headers(headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return { headers, status, statusText };
};


export default {
	handleGeminiAPIRequest
}
