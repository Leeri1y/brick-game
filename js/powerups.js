// src/js/powerups.js

const POWERUP_TYPES = {
    EXTRA_BALL: {
      id: 'extra-ball',
      color: '#ff69b4',
      duration: 0,
      apply: (game) => {
        const newBall = new Ball(game);
        newBall.reset();
        newBall.dx = game.ball.dx * -1; // 反向
        game.showFloatingText('双倍欢乐!', '#ff1493');
      }
    },
    EXPAND_PADDLE: {
      id: 'expand-paddle',
      color: '#7fff00',
      duration: 10000, // 10秒
      apply: (game) => {
        game.player.originalWidth = game.player.width;
        game.player.width *= 1.5;
        game.showFloatingText('超大号!', '#00ff00');
      },
      revert: (game) => {
        game.player.width = game.player.originalWidth;
      }
    },
    LASER: {
      id: 'laser',
      color: '#ff4500',
      duration: 8000, // 8秒
      apply: (game) => {
        game.player.hasLaser = true;
        game.showFloatingText('激光准备!', '#ff0000');
      },
      revert: (game) => {
        game.player.hasLaser = false;
      }
    }
  };

  // src/js/powerups.js (组合效果增强版)
const COMBO_EFFECTS = {
    // 激光+扩大挡板 = 超级激光
    'LASER+EXPAND_PADDLE': {
      name: '超级激光',
      color: '#ff00ff',
      duration: 15000,
      apply: (game) => {
        game.player.laserWidth = 25; // 更粗的激光
        game.player.laserDamage = 2; // 双倍伤害
        game.showFloatingText('超级激光激活!', '#ff00ff', 2000);
        game.particleSystem.createShockwave(game.player.x + game.player.width/2, game.player.y);
      },
      revert: (game) => {
        game.player.laserWidth = 15;
        game.player.laserDamage = 1;
      }
    },
    // 双球+激光 = 弹幕模式
    'EXTRA_BALL+LASER': {
      name: '弹幕风暴',
      color: '#ffff00',
      duration: 10000,
      apply: (game) => {
        game.balls.forEach(ball => {
          ball.size *= 1.5; // 增大球体
          ball.damage = 2;  // 增强破坏力
        });
        game.showFloatingText('弹幕风暴!', '#ffff00', 2000);
      },
      revert: (game) => {
        game.balls.forEach(ball => {
          ball.size /= 1.5;
          ball.damage = 1;
        });
      }
    }
  };
  
class Powerup {
    constructor(game, x, y, type) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.width = 30;
      this.height = 30;
      this.type = type;
      this.speed = 3;
      this.active = true;
      this.sparkleTimer = 0;
    }
  
    update(deltaTime) {
      if (!this.active) return;
  
      // 下落逻辑
      this.y += this.speed * (deltaTime / 16.67);
      
      // 边界检测
      if (this.y > this.game.gameHeight) {
        this.active = false;
      }
  
      // 碰撞检测
      if (this.checkCollision(this.game.player)) {
        // 激活道具效果
        this.game.powerupManager.activatePowerup(this.type);
        this.active = false;
      }
  
      // 粒子特效计时
      this.sparkleTimer += deltaTime;
    }
  
    checkCollision(target) {
      if (!target) return false;
      
      return (
        this.x < target.x + target.width &&
        this.x + this.width > target.x &&
        this.y < target.y + target.height &&
        this.y + this.height > target.y
      );
    }

    // 新增：检查组合效果
  checkCombinations() {
    const activeKeys = Array.from(this.activeEffects.keys());
    
    // 检查预定义的组合
    for (const [combo, effect] of Object.entries(COMBO_EFFECTS)) {
      const required = combo.split('+');
      if (required.every(type => activeKeys.includes(type))) {
        this.activateCombo(combo, effect);
        return; // 每次只触发一个最强组合
      }
    }
  }

  // 新增：激活组合效果
    activateCombo(comboId, effect) {
        // 取消组件效果的恢复计时
        comboId.split('+').forEach(type => {
        const timer = this.activeEffects.get(type);
        if (timer) clearTimeout(timer);
        });

        // 应用组合效果
        effect.apply(this.game);
        console.log(`COMBO!: ${effect.name}`);

        // 设置组合恢复计时
        const comboTimeout = setTimeout(() => {
        effect.revert(this.game);
        this.activeEffects.delete(comboId);
        this.game.showFloatingText(`${effect.name}结束`, effect.color);
        }, effect.duration);

        this.activeEffects.set(comboId, comboTimeout);
    }
  
    draw(ctx) {
      if (!this.active) return;
  
      // 主体绘制
      ctx.save();
      ctx.shadowColor = this.type.color;
      ctx.shadowBlur = 10;
      
      // 动态缩放效果
      const scale = 0.8 + Math.sin(Date.now()/200) * 0.2;
      ctx.translate(this.x + this.width/2, this.y + this.height/2);
      ctx.scale(scale, scale);
  
      // 绘制图标
      ctx.fillStyle = this.type.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.width/2, 0, Math.PI*2);
      ctx.fill();
  
      // 绘制特效
      if (this.sparkleTimer % 300 < 150) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2 + 3, 0, Math.PI*2);
        ctx.stroke();
      }
  
      ctx.restore();
    }
  }

    // 在Powerup类中修改draw方法添加组合提示
    Powerup.prototype.draw = function(ctx) {
        // ...原有绘制逻辑...
        
        // 组合提示特效
        if (this.sparkleTimer % 200 < 100) {
        const potentialCombos = Object.keys(COMBO_EFFECTS).filter(combo => 
            combo.includes(this.type.id));
        
        if (potentialCombos.length > 0) {
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.width/2, this.height/2, this.width/2 + 5, 0, Math.PI*2);
            ctx.stroke();
        }
        }
    };
  
class PowerupManager {
    constructor(game) {
      this.game = game;
      this.powerups = [];
      this.activeEffects = new Map();
      this.comboTimer = null;
    }
  
    spawnPowerup(x, y, type) {
      // 随机选择一个道具类型，如果未提供
      if (!type) {
        const types = Object.values(POWERUP_TYPES);
        type = types[Math.floor(Math.random() * types.length)];
      }

      const powerup = new Powerup(this.game, x, y, type);
      this.powerups.push(powerup);
      console.log(`生成道具: ${type.id} 在位置(${x}, ${y})`);
    }
  
    update(deltaTime) {
      this.powerups.forEach(powerup => powerup.update(deltaTime));
      
      // 清理非活跃道具
      this.powerups = this.powerups.filter(powerup => powerup.active);
    }
  
    draw(ctx) {
      this.powerups.forEach(powerup => powerup.draw(ctx));
    }
  
    reset() {
      this.powerups = [];
      this.activeEffects.forEach((timer, effectId) => {
        clearTimeout(timer);
        
        // 找到相应的效果类型，然后执行revert
        Object.values(POWERUP_TYPES).forEach(type => {
          if (type.id === effectId && typeof type.revert === 'function') {
            type.revert(this.game);
          }
        });
      });
      this.activeEffects.clear();
    }

    activatePowerup(powerup) {
      if (!powerup || !powerup.type) {
        console.error("无效的道具:", powerup);
        return;
      }
      
      const effect = powerup.type;
      console.log(`激活道具: ${effect.id}`);
      
      // 应用效果
      if (typeof effect.apply === 'function') {
        effect.apply(this.game);
      }
      
      // 如果有持续时间，设置计时器
      if (effect.duration > 0 && typeof effect.revert === 'function') {
        // 清除旧的同类型效果（如果有）
        if (this.activeEffects.has(effect.id)) {
          clearTimeout(this.activeEffects.get(effect.id));
        }
        
        // 设置新的计时器
        const timer = setTimeout(() => {
          effect.revert(this.game);
          this.activeEffects.delete(effect.id);
          console.log(`道具效果结束: ${effect.id}`);
        }, effect.duration);
        
        this.activeEffects.set(effect.id, timer);
      }
      
      // 创建获取道具特效
      if (typeof this.game.shakeScreen === 'function') {
        this.game.shakeScreen(5, 300);
      }
      
      if (typeof this.game.showFloatingText === 'function') {
        this.game.showFloatingText(`获得道具: ${effect.id}`, effect.color || '#ffffff');
      }
    }
  }
