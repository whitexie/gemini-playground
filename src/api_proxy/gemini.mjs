
async function handleGeminiAPIRequest(req) {
	try {
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
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
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

async function parseStream(chunk, controller) {
	chunk = await chunk;
	if (!chunk) { return; }
	this.buffer += chunk;
	do {
		const match = this.buffer.match(responseLineRE);
		if (!match) { break; }
		controller.enqueue(match[1]);
		this.buffer = this.buffer.substring(match[0].length);
	} while (true); // eslint-disable-line no-constant-condition
}

async function parseStreamFlush(controller) {
	if (this.buffer) {
		console.error("Invalid data:", this.buffer);
		controller.enqueue(this.buffer);
	}
}


export default {
	handleGeminiAPIRequest
}


async function toOpenAiStream (chunk, controller) {
  const transform = transformResponseStream.bind(this);
  const line = await chunk;
  if (!line) { return; }
  let data;
  try {
    data = JSON.parse(line);
  } catch (err) {
    console.error(line);
    console.error(err);
    const length = this.last.length || 1; // at least 1 error msg
    const candidates = Array.from({ length }, (_, index) => ({
      finishReason: "error",
      content: { parts: [{ text: err }] },
      index,
    }));
    data = { candidates };
  }
  const cand = data.candidates[0];
  console.assert(data.candidates.length === 1, "Unexpected candidates count: %d", data.candidates.length);
  cand.index = cand.index || 0; // absent in new -002 models response
  if (!this.last[cand.index]) {
    controller.enqueue(transform(data, false, "first"));
  }
  this.last[cand.index] = data;
  if (cand.content) { // prevent empty data (e.g. when MAX_TOKENS)
    controller.enqueue(transform(data));
  }
}

async function toOpenAiStreamFlush (controller) {
  const transform = transformResponseStream.bind(this);
  if (this.last.length > 0) {
    for (const data of this.last) {
      controller.enqueue(transform(data, "stop"));
    }
    controller.enqueue("data: [DONE]" + delimiter);
  }
}
