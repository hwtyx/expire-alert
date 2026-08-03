// /api/ocr.js - 百度OCR代理（保护API Key不暴露在前端）
// 前端 POST 图片 base64 -> 本函数转发百度OCR -> 返回识别文字

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.BAIDU_OCR_API_KEY;
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY;

  if (!apiKey || !secretKey || apiKey === '你的API_Key') {
    return res.status(500).json({ error: 'OCR服务未配置，请在Vercel环境变量中设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY' });
  }

  try {
    // 第一步：获取百度 access_token
    const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + apiKey + '&client_secret=' + secretKey;
    const tokenResp = await fetch(tokenUrl, { method: 'POST' });
    const tokenData = await tokenResp.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: '获取百度token失败：' + JSON.stringify(tokenData) });
    }

    const accessToken = tokenData.access_token;

    // 第二步：调用百度OCR高精度接口
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: '缺少图片数据' });
    }

    // 百度要求 base64 不含 data:image/... 前缀
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    const ocrUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=' + accessToken;

    const ocrResp = await fetch(ocrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'image=' + encodeURIComponent(base64Image)
    });

    const ocrData = await ocrResp.json();

    if (ocrData.error_code) {
      return res.status(500).json({ error: 'OCR识别失败：' + ocrData.error_msg + ' (code: ' + ocrData.error_code + ')' });
    }

    // 提取文字
    const words = (ocrData.words_result || []).map(item => item.words).join('\n');

    return res.status(200).json({ text: words });
  } catch(err) {
    return res.status(500).json({ error: '服务异常：' + (err.message || '未知错误') });
  }
}
