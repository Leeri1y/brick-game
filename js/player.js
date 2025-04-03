// src/js/player.js
class Player {
    constructor(game) {
        this.game = game;
        this.width = 100;
        this.height = 15;
        this.maxSpeed = 10;
        this.speed = 0;
        this.laserEnabled = false;
        this.lasers = [];
        this.maxLasers = 5;
        
        // 初始化位置
        this.reset();
        
        console.log('玩家初始化完成');
    }
    
    reset() {
        // 将挡板放置在游戏区域底部中央
        this.x = this.game.gameWidth / 2 - this.width / 2;
        this.y = this.game.gameHeight - this.height - 10;
        this.speed = 0;
        this.lasers = [];
        
        console.log(`挡板位置已重置: (${this.x}, ${this.y})`);
    }
    
    // 根据输入移动挡板
    move(direction) {
        // direction: -1表示向左, 1表示向右
        this.speed = direction * this.maxSpeed;
        
        if (this.game.debugMode) {
            console.log(`移动挡板, 方向: ${direction}, 速度: ${this.speed}`);
        }
    }
    
    // 向左移动
    moveLeft() {
        this.move(-1);
    }
    
    // 向右移动
    moveRight() {
        this.move(1);
    }
    
    // 处理触摸事件
    handleTouch(e) {
        e.preventDefault(); // 防止滚动
        
        if (!e.touches || e.touches.length === 0) return;
        
        try {
            const touch = e.touches[0];
            const rect = this.game.canvas.getBoundingClientRect();
            
            // 计算触摸点相对于画布的坐标
            const touchX = touch.clientX - rect.left;
            
            // 考虑画布的缩放比例
            const scale = this.game.canvas.width / rect.width; 
            const scaledX = touchX * scale;
            
            // 移动挡板到触摸点水平位置(中心对齐)
            const targetX = scaledX - this.width / 2;
            
            // 平滑过渡到目标位置 (简单的线性插值)
            const SMOOTHING = 0.5; // 0-1之间，越大移动越平滑
            this.x = this.x + (targetX - this.x) * SMOOTHING;
            
            // 确保挡板在画布范围内
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > this.game.gameWidth) {
                this.x = this.game.gameWidth - this.width;
            }
            
            if (this.game.debugMode) {
                console.log(`触摸移动挡板到 x: ${this.x}`);
            }
        } catch (error) {
            console.error("触摸事件处理错误:", error);
        }
    }
    
    // 应用滑动惯性效果
    applySwipeInertia() {
        // 如果还有惯性速度，则按照速度继续移动
        if (Math.abs(this.speed) > 0.1) {
            this.x += this.speed;
            
            // 应用阻尼，速度逐渐减少
            this.speed *= 0.9;
        } else {
            this.speed = 0;
        }
        
        // 确保挡板不会离开游戏区域
        if (this.x < 0) {
            this.x = 0;
            this.speed = 0;
        }
        if (this.x + this.width > this.game.gameWidth) {
            this.x = this.game.gameWidth - this.width;
            this.speed = 0;
        }
    }
    
    // 发射激光
    fireLaser() {
        if (!this.laserEnabled) return false;
        
        // 限制最大激光数量
        if (this.lasers.length >= this.maxLasers) return false;
        
        // 创建左右两侧的激光
        const leftLaser = {
            x: this.x + this.width * 0.2,
            y: this.y,
            width: 3,
            height: 0,
            speed: 8,
            active: true
        };
        
        const rightLaser = {
            x: this.x + this.width * 0.8,
            y: this.y,
            width: 3,
            height: 0,
            speed: 8,
            active: true
        };
        
        this.lasers.push(leftLaser, rightLaser);
        
        console.log('激光已发射');
        return true;
    }
    
    // 升级挡板
    upgrade(type) {
        switch(type) {
            case 'expand':
                const oldWidth = this.width;
                this.width = Math.min(this.width * 1.5, this.game.gameWidth * 0.5);
                // 调整位置以保持居中
                this.x -= (this.width - oldWidth) / 2;
                console.log(`挡板升级: 扩展 (新宽度: ${this.width})`);
                break;
            case 'laser':
                this.laserEnabled = true;
                console.log('挡板升级: 激光');
                break;
        }
        
        // 确保挡板不会离开游戏区域
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.game.gameWidth) {
            this.x = this.game.gameWidth - this.width;
        }
        
        return true;
    }
    
    // 更新挡板和激光状态
    update(deltaTime) {
        // 应用惯性和处理边界
        this.applySwipeInertia();
        
        // 更新所有激光
        this.lasers.forEach(laser => {
            if (laser.active) {
                // 激光向上移动
                laser.y -= laser.speed * (deltaTime / 16.67);
                // 激光拉长
                laser.height += laser.speed * (deltaTime / 16.67);
                
                // 检查激光是否超出屏幕
                if (laser.y + laser.height < 0) {
                    laser.active = false;
                }
            }
        });
        
        // 清理不活跃的激光
        this.lasers = this.lasers.filter(laser => laser.active);
    }
    
    // 绘制挡板和激光
    draw(ctx) {
        // 绘制激光
        this.drawLasers(ctx);
        // 绘制挡板
        this.drawPaddle(ctx);
    }
    
    // 绘制挡板
    drawPaddle(ctx) {
        // 绘制挡板主体
        ctx.fillStyle = '#ff85a2';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制挡板顶部高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.x, this.y, this.width, 3);
        
        // 绘制挡板底部阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);
        
        // 如果激光已激活，绘制激光发射器指示灯
        if (this.laserEnabled) {
            // 绘制左侧激光发射器
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(this.x + this.width * 0.2, this.y + 5, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制右侧激光发射器
            ctx.beginPath();
            ctx.arc(this.x + this.width * 0.8, this.y + 5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // 绘制激光
    drawLasers(ctx) {
        this.lasers.forEach(laser => {
            if (!laser.active) return;
            
            // 创建激光束的渐变效果
            const gradient = ctx.createLinearGradient(
                laser.x, laser.y, 
                laser.x, laser.y - laser.height
            );
            gradient.addColorStop(0, '#ff3366');  // 底部颜色
            gradient.addColorStop(0.5, '#ff6699'); // 中间颜色
            gradient.addColorStop(1, '#ffccff');  // 顶部颜色
            
            // 绘制激光主体
            ctx.fillStyle = gradient;
            ctx.fillRect(laser.x, laser.y - laser.height, laser.width, laser.height);
            
            // 添加激光的发光效果
            ctx.fillStyle = 'rgba(255, 102, 153, 0.3)';
            ctx.fillRect(laser.x - 2, laser.y - laser.height, laser.width + 4, laser.height);
        });
    }
    
    // 响应式布局支持
    resize() {
        // 更新挡板位置以适应新画布尺寸
        this.y = this.game.gameHeight - this.height - 10;
        
        // 确保挡板在画布范围内
        if (this.x + this.width > this.game.gameWidth) {
            this.x = this.game.gameWidth - this.width;
        }
        
        console.log(`挡板位置已调整: (${this.x}, ${this.y})`);
    }
}
