// recognize.js
Page({
  data: {
    imageUrl: '',
    recognizing: false,
    recognitionType: 'general', // 'general', 'ocr', 'qrcode', 'landmark'
    recognitionResult: null,
    showResult: false,
    apiKey: '6b2b3416-5129-4fdf-8499-faf753b2744e'
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imageUrl: tempFilePath,
          showResult: false,
          recognitionResult: null
        });
      }
    });
  },

  // 切换识别类型
  changeType(e) {
    this.setData({
      recognitionType: e.currentTarget.dataset.type,
      showResult: false,
      recognitionResult: null
    });
  },

  // 开始识别
  startRecognize() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    this.setData({
      recognizing: true
    });

    wx.showLoading({
      title: '识别中...',
    });

    // 将图片转为base64格式
    wx.getFileSystemManager().readFile({
      filePath: this.data.imageUrl,
      encoding: 'base64',
      success: res => {
        const base64Image = res.data;
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;
        
        // 调用ARK API进行图片识别
        this.callArkAPI(imageUrl);
      },
      fail: err => {
        console.error('读取图片失败:', err);
        this.handleError('读取图片失败');
      }
    });
  },

  // 调用ARK API
  callArkAPI(imageUrl) {
    wx.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.data.apiKey}`
      },
      data: {
        model: "doubao-1-5-vision-pro-32k-250115",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: "text",
                text: "详细识别这张图片中的内容，包括场景、主体、物体、文字等，并按照重要性给出详细描述。如果有文字，请列出所有文字内容。"
              }
            ]
          }
        ]
      },
      success: result => {
        console.log('API返回结果:', result);
        if (result.statusCode === 200 && result.data.choices && result.data.choices.length > 0) {
          const response = result.data.choices[0].message.content;
          
          // 处理API返回的结果
          this.processApiResponse(response);
        } else {
          this.handleError('API返回异常');
        }
      },
      fail: err => {
        console.error('API请求失败:', err);
        this.handleError('API请求失败');
      }
    });
  },

  // 处理API返回的结果
  processApiResponse(response) {
    const result = {
      text: response,
      type: 'AI识别结果'
    };

    this.setData({
      recognizing: false,
      recognitionResult: result,
      showResult: true
    });
    
    wx.hideLoading();
  },

  // 错误处理
  handleError(message) {
    this.setData({
      recognizing: false
    });
    wx.hideLoading();
    wx.showToast({
      title: message || '识别失败',
      icon: 'none'
    });
  },

  // 显示提示
  showTip() {
    wx.showModal({
      title: '功能说明',
      content: '图片识别功能使用ARK视觉大模型API，可以自动识别图片中的物体、场景、人物、文字等内容。',
      showCancel: false
    });
  }
})