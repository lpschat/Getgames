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

    // 修改为12小时缓存
    const cacheHeaders = {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=43200', // 12小时 = 12 * 60 * 60 秒
        'ETag': new Date().getTime().toString(), // 添加ETag
    }

    // 处理OPTIONS请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        })
    }

    // 使用 Cloudflare 的缓存
    const cache = caches.default
    let response = await cache.match(request)

    if (response) {
        return response
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

    response = await fetch(targetUrl)

    // 创建新的响应并添加缓存头
    const newResponse = new Response(response.body, {
        ...response,
        headers: {
            ...Object.fromEntries(response.headers),
            ...cacheHeaders
        }
    })

    // 存入 Cloudflare 缓存
    await cache.put(request, newResponse.clone())

    return newResponse
}