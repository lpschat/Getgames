addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // 修改 CORS 头配置
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, pragma, Origin, X-Requested-With, Accept',
    }

    // 处理OPTIONS请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        })
    }

    const url = new URL(request.url)
    let targetUrl

    // 根据路径决定请求哪个资源
    if (url.pathname === '/games') {
        targetUrl = 'https://002001a.oss-accelerate.aliyuncs.com/b/WenJian.json'
    } else if (url.pathname.startsWith('/game/')) {
        const bh = url.pathname.split('/')[2]
        targetUrl = `https://002001a.oss-accelerate.aliyuncs.com/c/${bh}.txt`
    } else {
        return new Response('Not Found', { status: 404 })
    }

    // 转发请求到目标服务器
    const response = await fetch(targetUrl)
    const newResponse = new Response(response.body, response)

    // 添加CORS头
    Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value)
    })

    return newResponse
}