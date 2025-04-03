// src/js/utils.js
export class GameUtils {
    static init(game) {
      this.game = game;
      this._particlePool = [];
      this._activeParticles = [];
      this._floatingTexts = [];
      this._shake = { intensity: 0, duration: 0 };
      this._initParticlePool(200); // 预初始化粒子对象池
    }
  
    // ======================
    // 粒子系统（对象池优化版）
    // ======================
    static _initParticlePool(size) {
      for (let i = 0; i < size; i++) {
        this._particlePool.push(this._createParticle());
      }
    }
  
    static _createParticle() {
      return {
        x: 0,
        y: 0,
        size: 0,
        color: '#ffffff',
        velocity: { x: 0, y: 0 },
        alpha: 1,
        rotation: 0,
        active: false,
        remaining: 0
      };
    }
  
    static createParticles(x, y, options = {}) {
      const {
        count = 10,
        color = '#ffffff',
        size = 5,
        lifespan = 1000,
        spread = 3,
        gravity = 0.1
      } = options;
      
      for (let i = 0; i < count; i++) {
        // 获取粒子实例（优先复用）
        const particle = this._getParticle();
        if (!particle) return; // 粒子池已满
        
        // 设置粒子属性
        particle.x = x;
        particle.y = y;
        particle.size = size + Math.random() * 3 - 1.5;
        particle.color = typeof color === 'function' ? color(i) : color;
        
        // 随机速度与角度
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * spread;
        particle.velocity.x = Math.cos(angle) * speed;
        particle.velocity.y = Math.sin(angle) * speed - Math.random() * 2;
        
        // 生命周期
        particle.active = true;
        particle.alpha = 1;
        particle.remaining = lifespan + Math.random() * 500;
        particle.gravity = gravity;
        
        // 添加到活跃粒子列表
        this._activeParticles.push(particle);
      }
    }
  
    static _getParticle() {
      // 优先使用回收的粒子
      const recycled = this._activeParticles.find(p => !p.active);
      if (recycled) return recycled;
  
      // 从对象池获取新粒子
      if (this._particlePool.length > 0) {
        return this._particlePool.pop();
      }
      return null; // 达到上限时不再创建
    }
  
    // ======================
    // 高级特效类型
    // ======================
    static createEffect(type, position, options = {}) {
      const baseColor = options.color || '#ffffff';
      
      switch(type) {
        case 'laser-hit':
          this.createParticles(position.x, position.y, {
            count: 8,
            color: baseColor,
            size: { base: 2, variance: 1 },
            speed: { base: 3, variance: 1 },
            shape: 'rect',
            spread: Math.PI/4
          });
          break;
  
        case 'combo-burst':
          this.createParticles(position.x, position.y, {
            count: 15,
            color: this._rainbowGradient(options.combo),
            size: { base: 4, variance: 2 },
            speed: { base: 5, variance: 2 },
            lifetime: 1200
          });
          this.shakeScreen(3 + options.combo * 0.5, 800);
          break;
  
        case 'boss-explode':
          this.createParticles(position.x, position.y, {
            count: 30,
            color: '#ff4500',
            size: { base: 6, variance: 3 },
            speed: { base: 8, variance: 3 },
            lifetime: 1500
          });
          this.shakeScreen(15, 1200);
          break;
      }
    }
  
    // ======================
    // 浮动文字系统优化
    // ======================
    static showFloatingText(text, options = {}) {
      const {
        position = { x: this.game.gameWidth/2, y: this.game.gameHeight/2 },
        color = '#ffffff',
        duration = 1500,
        size = 24,
        motion = 'float' // float/bounce/shake
      } = options;
  
      this._floatingTexts.push({
        text,
        x: position.x,
        y: position.y,
        color,
        size,
        alpha: 1,
        velocity: this._getTextMotion(motion),
        startTime: Date.now(),
        duration
      });
    }
  
    static _getTextMotion(type) {
      switch(type) {
        case 'bounce':
          return { x: 0, y: -2 };
        case 'shake':
          return { x: Math.random() * 2 - 1, y: -1 };
        case 'float':
        default:
          return { x: 0, y: -1 };
      }
    }
  
    // ======================
    // 屏幕震动增强
    // ======================
    static shakeScreen(intensity = 10, duration = 500) {
      if (intensity > this._shake.intensity) {
        this._shake.intensity = intensity;
        this._shake.duration = duration;
        this._shake.startTime = Date.now();
      }
    }
  
    // ======================
    // 游戏循环更新
    // ======================
    static update(deltaTime) {
      this._updateParticles(deltaTime);
      this._updateFloatingTexts(deltaTime);
      this._updateScreenShake();
    }
  
    static _updateParticles(deltaTime) {
      this._activeParticles.forEach(p => {
        if (!p.active) return;
  
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.velocity.y += p.gravity || 0.1; // 重力影响
        p.remaining -= deltaTime;
        p.rotation += 0.1;
        p.alpha = Math.min(1, p.remaining / 300); // 淡出效果
  
        if (p.remaining <= 0) {
          p.active = false;
          this._particlePool.push(p); // 回收到对象池
        }
      });
  
      // 清理非活跃粒子
      this._activeParticles = this._activeParticles.filter(p => p.active || p.remaining > 0);
    }
  
    static _updateFloatingTexts(deltaTime) {
      const now = Date.now();
      this._floatingTexts = this._floatingTexts.filter(text => {
        const elapsed = now - text.startTime;
        
        // 更新位置
        text.x += text.velocity.x;
        text.y += text.velocity.y;
        
        // 更新透明度（淡出效果）
        text.alpha = Math.max(0, 1 - elapsed / text.duration);
        
        return elapsed < text.duration;
      });
    }
  
    static _updateScreenShake() {
      if (this._shake.intensity <= 0) return;
      
      const elapsed = Date.now() - this._shake.startTime;
      if (elapsed >= this._shake.duration) {
        this._shake.intensity = 0;
        return;
      }
      
      // 随着时间衰减
      this._shake.intensity = this._shake.intensity * (1 - elapsed / this._shake.duration);
    }
  
    // ======================
    // 渲染管线
    // ======================
    static draw(ctx) {
      ctx.save();
      this._applyScreenShake(ctx);
      this._drawParticles(ctx);
      this._drawFloatingTexts(ctx);
      ctx.restore();
    }
  
    static _applyScreenShake(ctx) {
      if (this._shake.intensity <= 0) return;
      
      const dx = Math.random() * this._shake.intensity * 2 - this._shake.intensity;
      const dy = Math.random() * this._shake.intensity * 2 - this._shake.intensity;
      
      ctx.translate(dx, dy);
    }
  
    static _drawParticles(ctx) {
      this._activeParticles.forEach(p => {
        if (!p.active) return;
        
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // 绘制粒子（可以是各种形状）
        ctx.fillStyle = p.color;
        ctx.beginPath();
        
        // 随机选择形状
        const shapeId = Math.abs(Math.floor(p.rotation * 3)) % 3;
        
        switch(shapeId) {
          case 0: // 圆形
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            break;
          case 1: // 方形
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            break;
          case 2: // 三角形
            ctx.moveTo(-p.size/2, p.size/2);
            ctx.lineTo(p.size/2, p.size/2);
            ctx.lineTo(0, -p.size/2);
            break;
        }
        
        ctx.fill();
        ctx.restore();
      });
    }
  
    static _drawFloatingTexts(ctx) {
      ctx.textAlign = 'center';
      
      this._floatingTexts.forEach(text => {
        ctx.globalAlpha = text.alpha;
        ctx.font = `${text.size}px "Ma Shan Zheng"`;
        
        // 添加发光效果
        ctx.shadowColor = text.color;
        ctx.shadowBlur = 5;
        
        // 添加描边
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(text.text, text.x, text.y);
        
        // 绘制文字
        ctx.fillStyle = text.color;
        ctx.fillText(text.text, text.x, text.y);
      });
      
      // 重置透明度
      ctx.globalAlpha = 1;
    }
  
    // ======================
    // 工具方法增强
    // ======================
    static _varyColor(baseColor, variance = 30) {
      const hexMatch = baseColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (hexMatch) {
        const channels = hexMatch.slice(1).map(c => parseInt(c, 16));
        return channels.map(c => 
          Math.min(255, Math.max(0, c + (Math.random() * variance - variance / 2)))
        ).join(',');
      }
      return baseColor;
    }
  
    static _rainbowGradient(value) {
      const hue = (value * 20) % 360;
      return `hsl(${hue}, 90%, 60%)`;
    }
  
    static get screenShake() {
      return this._shake.intensity > 0;
    }
  }
  
  // 初始化适配器
  const initUtils = (game) => GameUtils.init(game);
  
  export { GameUtils, initUtils };
