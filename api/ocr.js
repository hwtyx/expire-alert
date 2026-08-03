// /api/ocr.js - 百度OCR代理（CommonJS 格式）
const https = require('https');
const { URL } = require('url');

函数 postJSON(url, data) {
  返回 一个新的 Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      路径: urlObj.pathname + urlObj.search,
      方法: 'POST',
      请求头: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function postForm(url, body) {
  返回 一个新的 Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.baidu_ocr_api_key;
  const secretKey = process.env.baidu_ocr_secret_key;

  if (!apiKey || !secretKey) {
    return res.status(500).json({ error: 'OCR服务未配置，请在Vercel环境变量中设置 baidu_ocr_api_key 和 baidu_ocr_secret_key' });
  }

  try {
    const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + apiKey + '&client_secret=' + secretKey;
    const tokenData = await postJSON(tokenUrl, {});

    if (!tokenData.access_token) {
      返回 res.状态(500).json({ 错误: '获取百度token失败：' + JSON.字符串化(tokenData) });
    }

    const accessToken = tokenData.access_token;
    const { image } = req.body;

    如果 (!image) {
      返回 res.状态(400).json({ 错误: '缺少图片数据' });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const ocrUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=' + accessToken;
    const ocrData = await postForm(ocrUrl, 'image=' + encodeURIComponent(base64Image));

    if (ocrData.error_code) {
      返回 res.状态(500).json({ 错误: 'OCR识别失败：' + ocrData.错误信息 + '（代码：' + ocrData.错误代码 + ')' });
    }

    const words = (ocrData.words_result || []).map(item => item.words).join('\n');
    return res.status(200).json({ text: words });
  } catch(err) {
    返回 res.状态(500).json({ 错误: '服务异常：' + (err.消息 || '未知错误') });
  }
};
