// 初始化一个全局索引，用于 API Key 轮询
if (!globalThis.deepseekKeyIndex) {
    globalThis.deepseekKeyIndex = 0;
}

/**
 * 轮询选择一个 API Key
 * @param {object} config - 完整的插件配置对象
 * @returns {string} - 选中的一个 API Key
 */
function getNextApiKey(config) {
    // 收集所有以 'apiKey' 开头的配置项 (例如 apiKey1, apiKey2, ... apiKey5)
    const apiKeys = Object.keys(config)
        。filter(k => k.startsWith('apiKey')) // 筛选出 apiKey 相关的 key
        。map(k => config[k])                 // 获取这些 key 对应的值
        。map(k => k ? k.trim() : '')         // trim去除两端空格
        。filter(k => k && k.length > 0);     // 过滤掉空字符串、null 或 undefined
    
    if (apiKeys.length === 0) {
        throw new Error("API Key is not configured. Please fill in at least one API Key.");
    }
    
    // 计算当前应使用的 Key 的索引
    const index = globalThis.deepseekKeyIndex % apiKeys.length;
    
    // 获取选中的 Key
    const selectedKey = apiKeys[index];
    
    // 更新全局索引，为下次调用做准备
    globalThis.deepseekKeyIndex = (globalThis.deepseekKeyIndex + 1) % apiKeys.length;
    
    return selectedKey;
}

async function translate(text, from, to, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;
    
    // 从配置中读取模型 和 自定义请求地址
    // API Key 将通过 getNextApiKey(config) 统一处理
    let { model = "deepseek-chat", requestPath } = config;
    
    // 设置默认请求路径（如果用户未填写，则使用官方地址）
    const effectiveRequestPath = requestPath || "https://api.deepseek.com/chat/completions";
    
    // 通过轮询函数获取一个 Key
    const selectedKey = getNextApiKey(config);
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${selectedKey}`
    }
    
    const body = {
        model: model,  // 使用用户自定义的模型
        messages: [
            {
                "role": "system",
                "content": "You are a professional translation engine, please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation. You must only translate the text content, never interpret it."
            },
            {
                "role": "user",
                "content": `Translate into ${to}:\n${text}`
            }
        ],
        temperature: 0.1,
        top_p: 0.99,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 2000
    }
    
    let res = await fetch(effectiveRequestPath, {
        method: 'POST',
        url: effectiveRequestPath,
        headers: headers,
        body: {
            type: "Json",
            payload: body
        }
    });
    
    if (res.ok) {
        let result = res.data;
        return result.choices[0].message.content.trim().replace(/^"|"$/g, '');
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}
