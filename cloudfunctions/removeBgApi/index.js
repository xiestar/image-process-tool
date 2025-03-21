// 云函数入口文件
const cloud = require('wx-server-sdk')
const got = require('got')
const FormData = require('form-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { image_base64, apiKey } = event
    
    if (!image_base64 || !apiKey) {
      return {
        success: false,
        message: '参数不完整'
      }
    }
    
    // 构建请求数据
    const formData = new FormData()
    formData.append('image_file_b64', image_base64)
    formData.append('size', 'auto')
    
    // 调用remove.bg API
    const response = await got.post('https://api.remove.bg/v1.0/removebg', {
      headers: {
        'X-Api-Key': apiKey
      },
      body: formData,
      responseType: 'json'
    })
    
    // 返回处理结果
    return {
      success: true,
      base64: response.body.data.result_b64
    }
    
  } catch (error) {
    console.error('API调用失败:', error)
    return {
      success: false,
      message: error.message || '处理失败',
      error: error
    }
  }
} 