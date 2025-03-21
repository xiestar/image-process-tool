// pages/compress/compress.js
Page({
  data: {
    imagePath: '',
    compressedImagePath: '',
    originalWidth: 0,
    originalHeight: 0,
    originalSize: '0KB',
    compressedSize: '0KB',
    compressionRate: 0,
    quality: 80
  },

  // 选择图片
  chooseImage: function() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const fileSize = res.tempFiles[0].size;
        
        // 获取图片信息
        wx.getImageInfo({
          src: tempFilePath,
          success: (imgInfo) => {
            that.setData({
              imagePath: tempFilePath,
              originalWidth: imgInfo.width,
              originalHeight: imgInfo.height,
              originalSize: that.formatFileSize(fileSize),
              compressedImagePath: '',
              compressionRate: 0
            });
          }
        });
      }
    });
  },

  // 压缩质量滑块变化
  onQualityChange: function(e) {
    this.setData({
      quality: e.detail.value
    });
  },

  // 压缩图片
  compressImage: function() {
    const that = this;
    wx.showLoading({
      title: '压缩中...',
    });

    wx.compressImage({
      src: that.data.imagePath,
      quality: that.data.quality,
      success: (res) => {
        // 获取压缩后图片信息
        wx.getFileInfo({
          filePath: res.tempFilePath,
          success: (fileInfo) => {
            const originalSize = parseFloat(that.data.originalSize);
            const compressedSize = that.formatFileSize(fileInfo.size);
            const originalSizeNum = that.parseFileSize(that.data.originalSize);
            const compressedSizeNum = fileInfo.size;
            
            // 计算压缩率
            const savingRate = Math.round((1 - compressedSizeNum / originalSizeNum) * 100);
            
            that.setData({
              compressedImagePath: res.tempFilePath,
              compressedSize: compressedSize,
              compressionRate: savingRate
            });
            
            wx.hideLoading();
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '压缩失败',
          icon: 'none'
        });
        console.error('Compression failed:', err);
      }
    });
  },

  // 重新选择图片
  resetImage: function() {
    this.setData({
      imagePath: '',
      compressedImagePath: '',
      originalWidth: 0,
      originalHeight: 0,
      originalSize: '0KB',
      compressedSize: '0KB',
      compressionRate: 0,
      quality: 80
    });
  },

  // 保存压缩图片到相册
  saveCompressedImage: function() {
    const that = this;
    wx.saveImageToPhotosAlbum({
      filePath: that.data.compressedImagePath,
      success: function() {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: function(res) {
        console.log(res);
        if (res.errMsg === "saveImageToPhotosAlbum:fail auth deny") {
          wx.showModal({
            title: '提示',
            content: '需要授权保存图片到相册',
            success: function(res) {
              if (res.confirm) {
                wx.openSetting({
                  success(res) {
                    if (res.authSetting['scope.writePhotosAlbum']) {
                      wx.showToast({
                        title: '授权成功',
                        icon: 'success',
                        duration: 1000
                      });
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  // 格式化文件大小
  formatFileSize: function(size) {
    const KB = 1024;
    const MB = KB * 1024;
    
    if (size < KB) {
      return size + 'B';
    } else if (size < MB) {
      return (size / KB).toFixed(2) + 'KB';
    } else {
      return (size / MB).toFixed(2) + 'MB';
    }
  },

  // 解析文件大小为数字(字节)
  parseFileSize: function(sizeStr) {
    if (!sizeStr) return 0;
    
    const unit = sizeStr.slice(-2);
    const size = parseFloat(sizeStr.slice(0, -2));
    
    if (unit === 'KB') {
      return size * 1024;
    } else if (unit === 'MB') {
      return size * 1024 * 1024;
    } else {
      return size;
    }
  }
}) 