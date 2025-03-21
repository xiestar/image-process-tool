// removebg.js
Page({
  data: {
    imageUrl: '',
    resultImageUrl: '',
    processing: false,
    showResult: false,
    canvasWidth: 0,
    canvasHeight: 0,
    apiKey: 'BZqw5WiuEoCzJCvSwCZ6ZpYm'
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
          resultImageUrl: '',
          showResult: false
        });
      }
    });
  },

  // 抠图去背景
  removeBg() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    this.setData({
      processing: true
    });

    wx.showLoading({
      title: '正在处理图片...',
    });

    // 读取图片并转为base64
    wx.getFileSystemManager().readFile({
      filePath: this.data.imageUrl,
      encoding: 'base64',
      success: res => {
        const base64Image = res.data;
        
        // 调用remove.bg API
        wx.request({
          url: 'https://api.remove.bg/v1.0/removebg',
          method: 'POST',
          header: {
            'X-Api-Key': this.data.apiKey,
            'Content-Type': 'application/json'
          },
          data: {
            image_file_b64: base64Image,
            size: 'auto'
          },
          responseType: 'arraybuffer',
          success: result => {
            // 将返回的图片数据保存为临时文件
            const fs = wx.getFileSystemManager();
            const filePath = `${wx.env.USER_DATA_PATH}/removed_bg.png`;
            
            fs.writeFile({
              filePath: filePath,
              data: result.data,
              encoding: 'binary',
              success: () => {
                this.setData({
                  resultImageUrl: filePath,
                  showResult: true,
                  processing: false
                });
                wx.hideLoading();
              },
              fail: err => {
                console.error('保存结果失败:', err);
                this.handleError('保存结果失败');
              }
            });
          },
          fail: err => {
            console.error('API请求失败:', err);
            this.handleError('API请求失败');
          }
        });
      },
      fail: err => {
        console.error('读取图片失败:', err);
        this.handleError('读取图片失败');
      }
    });
  },

  // 错误处理
  handleError(message) {
    this.setData({
      processing: false
    });
    wx.hideLoading();
    wx.showToast({
      title: message || '处理失败',
      icon: 'none'
    });
  },

  // 保存图片
  saveImage() {
    if (!this.data.resultImageUrl) {
      wx.showToast({
        title: '请先处理图片',
        icon: 'none'
      });
      return;
    }

    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultImageUrl,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('保存失败:', err);
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存到相册',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 显示提示
  showTip() {
    wx.showModal({
      title: 'Remove.bg API功能',
      content: '抠图去背景功能通过调用Remove.bg API实现，可以自动识别主体并移除背景。处理结果将保留透明背景。',
      showCancel: false
    });
  }
}) 