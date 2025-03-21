// idphoto.js
Page({
  data: {
    imageUrl: '',
    resultImageUrl: '',
    processing: false,
    showResult: false,
    photoType: 'one_inch', // 默认为一寸照
    photoTypes: [
      { id: 'one_inch', name: '一寸照', width: 295, height: 413, bgColor: '#ffffff' },
      { id: 'two_inch', name: '二寸照', width: 413, height: 579, bgColor: '#ffffff' }
    ],
    bgColor: '#ffffff', // 背景颜色
    commonColors: ['#ffffff', '#2e71b8', '#ff0000'],
    currentStep: '准备就绪', // 用于调试
    removedBgImageUrl: '', // 抠图后的图片路径
    apiKey: 'BZqw5WiuEoCzJCvSwCZ6ZpYm', // 使用同样的API密钥
    useOriginalFallback: true // 如果抠图失败，使用原图作为备选
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
          removedBgImageUrl: '',
          showResult: false,
          currentStep: '已选择图片'
        });
      }
    });
  },

  // 切换证件照类型
  changePhotoType(e) {
    const type = e.currentTarget.dataset.type;
    const photoType = this.data.photoTypes.find(item => item.id === type);
    
    this.setData({
      photoType: type,
      bgColor: photoType.bgColor
    }, () => {
      // 如果已经生成了结果，切换类型后自动重新生成
      if (this.data.showResult) {
        this.generatePhoto();
      }
    });
  },

  // 选择背景颜色
  selectBgColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      bgColor: color
    }, () => {
      // 如果已经生成了结果，更改背景色后自动重新生成
      if (this.data.showResult) {
        this.generatePhoto();
      }
    });
  },

  // 生成证件照 - 主入口函数
  generatePhoto() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    this.setData({
      processing: true,
      currentStep: '开始生成证件照',
      showResult: false
    });

    wx.showLoading({
      title: '处理中...',
    });

    // 尝试先进行抠图，如果抠图失败则直接处理原图
    this.removeBg();
  },

  // 抠图功能
  removeBg() {
    this.setData({ currentStep: '正在抠图...' });
    
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
            this.setData({ currentStep: '抠图完成，处理结果...' });
            
            // 将返回的图片数据保存为临时文件
            const fs = wx.getFileSystemManager();
            const filePath = `${wx.env.USER_DATA_PATH}/removed_bg_idphoto.png`;
            
            fs.writeFile({
              filePath: filePath,
              data: result.data,
              encoding: 'binary',
              success: () => {
                this.setData({
                  removedBgImageUrl: filePath,
                  currentStep: '抠图临时文件已保存'
                });
                
                // 抠图完成后继续处理证件照
                this.processPhoto();
              },
              fail: err => {
                console.error('保存抠图结果失败:', err);
                // 如果启用了备用选项，则使用原图继续处理
                if (this.data.useOriginalFallback) {
                  this.setData({ currentStep: '抠图失败，使用原图处理' });
                  this.processPhoto();
                } else {
                  this.handleError('保存抠图结果失败');
                }
              }
            });
          },
          fail: err => {
            console.error('抠图API请求失败:', err);
            // 如果启用了备用选项，则使用原图继续处理
            if (this.data.useOriginalFallback) {
              this.setData({ currentStep: '抠图API失败，使用原图处理' });
              this.processPhoto();
            } else {
              this.handleError('抠图API请求失败');
            }
          }
        });
      },
      fail: err => {
        console.error('读取图片失败:', err);
        // 如果启用了备用选项，则使用原图继续处理
        if (this.data.useOriginalFallback) {
          this.setData({ currentStep: '读取图片失败，直接处理原图' });
          this.processPhoto();
        } else {
          this.handleError('读取图片失败');
        }
      }
    });
  },

  // 处理照片 - 裁剪图片并应用背景颜色
  processPhoto() {
    // 获取当前选择的证件照类型
    const photoType = this.data.photoTypes.find(item => item.id === this.data.photoType);
    
    // 使用抠图结果或原图
    const imageSource = this.data.removedBgImageUrl || this.data.imageUrl;
    
    this.setData({ 
      currentStep: this.data.removedBgImageUrl ? 
        '开始合成抠图结果' : '开始处理原图' 
    });
    
    // 使用简化的绘制方法
    this.drawWithExactSize(photoType, imageSource);
  },

  // 精确尺寸绘制方法
  drawWithExactSize(photoType, imageSource) {
    try {
      // 获取照片尺寸 - 与证件照规格完全一致
      const targetWidth = photoType.width;
      const targetHeight = photoType.height;
      
      console.log('目标尺寸:', targetWidth, 'x', targetHeight);
      
      // 更新Canvas尺寸
      this.setData({
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        currentStep: '设置Canvas尺寸'
      });
      
      // 获取图片信息
      wx.getImageInfo({
        src: imageSource,
        success: res => {
          this.setData({ currentStep: '获取图片信息成功' });
          console.log('图片信息:', res.width, 'x', res.height);
          
          // 创建绘图上下文
          const ctx = wx.createCanvasContext('photoCanvas', this);
          
          // 清空画布
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          
          // 绘制背景色 - 只在图片区域应用
          ctx.fillStyle = this.data.bgColor;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // 计算裁剪参数
          const imgWidth = res.width;
          const imgHeight = res.height;
          const targetRatio = targetWidth / targetHeight;
          const imgRatio = imgWidth / imgHeight;
          
          // 裁剪参数
          let sx = 0, sy = 0, sWidth = 0, sHeight = 0;
          
          // 判断是抠图结果还是原图
          const isRemovedBg = imageSource === this.data.removedBgImageUrl;
          
          // 裁剪逻辑
          if (imgRatio > targetRatio) {
            // 原图较宽，裁剪两侧
            sHeight = imgHeight;
            sWidth = imgHeight * targetRatio;
            sx = (imgWidth - sWidth) / 2;
            sy = 0;
          } else {
            // 原图较高，裁剪上下
            sWidth = imgWidth;
            sHeight = imgWidth / targetRatio;
            sx = 0;
            
            // 证件照特殊处理，人脸位于上部
            const faceCenter = imgHeight * 0.38;
            sy = faceCenter - (sHeight * 0.4);
            
            // 边界处理
            if (sy < 0) sy = 0;
            if (sy + sHeight > imgHeight) sy = imgHeight - sHeight;
          }
          
          console.log('裁剪参数:', sx, sy, sWidth, sHeight);
          this.setData({ currentStep: '计算裁剪参数完成' });
          
          // 绘制图像
          ctx.drawImage(
            imageSource,
            sx, sy, sWidth, sHeight,
            0, 0, targetWidth, targetHeight
          );
          
          // 完成绘制
          ctx.draw(false, () => {
            this.setData({ 
              currentStep: '绘制完成，准备导出',
              imageType: isRemovedBg ? '抠图结果' : '原图'
            });
            
            // 等待绘制完成
            setTimeout(() => {
              this.exportExactSizeImage(targetWidth, targetHeight);
            }, 500);
          });
        },
        fail: error => {
          console.error('获取图片信息失败:', error);
          this.handleError('获取图片信息失败，请重新选择图片');
        }
      });
    } catch (error) {
      console.error('绘制错误:', error);
      this.handleError('绘制过程出错，请重试');
    }
  },
  
  // 导出精确尺寸图片
  exportExactSizeImage(width, height) {
    try {
      this.setData({ currentStep: '开始导出图片' });
      wx.canvasToTempFilePath({
        canvasId: 'photoCanvas',
        x: 0,
        y: 0,
        width: width,
        height: height,
        destWidth: width,
        destHeight: height,
        fileType: 'jpg',
        quality: 1.0, // 使用最高质量
        success: res => {
          console.log('导出成功:', res.tempFilePath);
          this.setData({ currentStep: '导出成功' });
          
          // 隐藏加载提示
          wx.hideLoading();
          
          // 直接设置结果
          this.setData({
            resultImageUrl: res.tempFilePath,
            showResult: true,
            processing: false,
            currentStep: '结果设置完成'
          });
          
          // 确保结果图片可见
          setTimeout(() => {
            wx.createSelectorQuery()
              .select('#resultArea')
              .boundingClientRect(rect => {
                if (rect && rect.top) {
                  wx.pageScrollTo({
                    scrollTop: rect.top,
                    duration: 300
                  });
                }
              }).exec();
          }, 300);
        },
        fail: err => {
          console.error('导出图片失败:', err);
          this.handleError('导出图片失败，请重试');
        }
      }, this);
    } catch (error) {
      console.error('导出过程错误:', error);
      this.handleError('导出过程出错，请重试');
    }
  },

  // 统一错误处理
  handleError(message) {
    console.error('证件照生成错误:', message);
    
    this.setData({
      currentStep: '出错: ' + message,
      processing: false
    });
    
    wx.hideLoading();
    wx.showToast({
      title: message || '处理失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 保存证件照
  savePhoto() {
    if (!this.data.resultImageUrl) {
      wx.showToast({
        title: '请先生成证件照',
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
      fail: () => {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  // 查看帮助提示
  showTip() {
    wx.showModal({
      title: '证件照制作说明',
      content: '1. 选择一寸照或二寸照尺寸\n2. 选择白色、蓝色或红色背景\n3. 上传清晰的正面照片，保持面部居中\n4. 点击生成按钮，系统会自动抠出人像并合成所需背景\n5. 照片按照所选规格精确裁剪\n6. 一寸照尺寸为295×413，二寸照为413×579',
      showCancel: false
    });
  },

  // 图片加载成功
  onImageLoad(e) {
    console.log('结果图片加载成功');
    this.setData({ currentStep: '结果图片加载成功' });
  },
  
  // 图片加载失败
  onImageError(e) {
    console.error('结果图片加载失败');
    this.setData({ currentStep: '结果图片加载失败' });
  }
}) 