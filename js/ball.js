class Ball {
    constructor(game) {
        this.game = game;
        this.reset();
        // 小球特效系统
        this.trail = [];
        this.maxTrailLength = 5;
        
        console.log('小球已创建');
    }

    reset() {
        this.x = this.game.gameWidth / 2;
        this.y = this.game.gameHeight - 60;
        this.speed = 5;
        this.dx = 0;
        this.dy = -this.speed;
        this.size = 8;
        this.active = true;
        this.trail = [];
        
        console.log(`小球已重置 - 位置: (${this.x.toFixed(2)}, ${this.y.toFixed(2)}), 速度: ${this.speed}, 方向: (${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
    }

    // 更新小球位置和特效
    update(deltaTime) {
        // 只有当小球处于活跃状态时才更新
        if (!this.active) return;
        
        const oldX = this.x;
        const oldY = this.y;
        
        // 更新位置
        this.x += this.dx * (deltaTime / 16.67);
        this.y += this.dy * (deltaTime / 16.67);
        
        // 记录位置变化较大的情况
        if (Math.abs(this.x - oldX) > 10 || Math.abs(this.y - oldY) > 10) {
            console.log(`小球位置变化较大 - 从(${oldX.toFixed(2)}, ${oldY.toFixed(2)}) 到 (${this.x.toFixed(2)}, ${this.y.toFixed(2)}), deltaTime: ${deltaTime}`);
        }
        
        // 添加轨迹点
        this.trail.unshift({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // 边界检测与反弹
        this.checkBoundaries();
    }
    
    // 绘制小球和特效
    draw(ctx) {
        if (!this.active) return;
        
        // 绘制轨迹
        this.trail.forEach((point, index) => {
            const alpha = 1 - index / this.maxTrailLength;
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 105, 180, ${alpha * 0.5})`;
            const size = this.size * (1 - index / this.maxTrailLength);
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 绘制主球体
        ctx.beginPath();
        ctx.fillStyle = '#FF69B4'; // 粉色
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加高光效果
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.arc(this.x - this.size / 3, this.y - this.size / 3, this.size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制状态信息 - 仅调试模式下
        if (this.game.debugMode) {
            ctx.font = '10px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(`速度: ${this.speed.toFixed(1)}`, this.x + 15, this.y - 10);
            ctx.fillText(`方向: (${this.dx.toFixed(1)}, ${this.dy.toFixed(1)})`, this.x + 15, this.y);
        }
    }
    
    // 边界检测
    checkBoundaries() {
        // 左右边界
        if (this.x - this.size <= 0) {
            this.x = this.size;
            this.dx = Math.abs(this.dx);
            console.log(`小球碰撞左边界，反弹 - 新方向: (${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
        } else if (this.x + this.size >= this.game.gameWidth) {
            this.x = this.game.gameWidth - this.size;
            this.dx = -Math.abs(this.dx);
            console.log(`小球碰撞右边界，反弹 - 新方向: (${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
        }
        
        // 上边界
        if (this.y - this.size <= 0) {
            this.y = this.size;
            this.dy = Math.abs(this.dy);
            console.log(`小球碰撞上边界，反弹 - 新方向: (${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
        }
        
        // 下边界 (游戏结束)
        if (this.y + this.size > this.game.gameHeight) {
            this.active = false;
            console.log(`小球掉落 - 位置: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
            // 通知游戏系统球已掉落
            if (this.game.handleBallLost) {
                this.game.handleBallLost(this);
            }
        }
    }
    
    // 碰撞检测
    collideWith(object) {
        // 改进的圆形与矩形碰撞检测
        // 首先确保对象具有正确的位置和尺寸属性
        if (!object || typeof object.x !== 'number' || typeof object.y !== 'number' || 
            typeof object.width !== 'number' || typeof object.height !== 'number') {
            console.warn("碰撞检测失败 - 对象属性不正确:", object);
            return false;
        }
        
        // 找到矩形上距离圆心最近的点
        const closestX = Math.max(object.x, Math.min(this.x, object.x + object.width));
        const closestY = Math.max(object.y, Math.min(this.y, object.y + object.height));
        
        // 计算该点到圆心的距离
        const distanceX = this.x - closestX;
        const distanceY = this.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        // 调试模式下显示碰撞检测结果
        if (this.game.debugMode) {
            // 打印更详细的碰撞检测信息
            const isColliding = distanceSquared <= (this.size * this.size);
            if (isColliding) {
                console.log(`碰撞检测成功: 球(${this.x.toFixed(1)},${this.y.toFixed(1)}) 与 对象(${object.x.toFixed(1)},${object.y.toFixed(1)}, ${object.width.toFixed(1)}x${object.height.toFixed(1)})`);
            }
        }
        
        // 如果距离小于等于圆的半径，则发生碰撞
        return distanceSquared <= (this.size * this.size);
    }
    
    // 处理与挡板的碰撞
    handlePaddleCollision(paddle) {
        // 计算相对位置，用于确定反弹角度
        const relativePosition = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        
        // 根据碰撞位置计算反弹角度
        const angle = relativePosition * Math.PI / 3; // 最大±60度
        
        // 保存旧方向以便记录
        const oldDx = this.dx;
        const oldDy = this.dy;
        
        // 更新速度
        this.dx = this.speed * Math.sin(angle);
        this.dy = -this.speed * Math.cos(angle);
        
        // 确保小球始终向上运动
        if (this.dy > 0) this.dy = -this.dy;
        
        // 设置小球位置，确保不会卡在挡板中
        this.y = paddle.y - this.size;
        
        console.log(`小球碰撞挡板 - 相对位置: ${relativePosition.toFixed(2)}, 角度: ${(angle * 180 / Math.PI).toFixed(1)}°, 速度从(${oldDx.toFixed(2)}, ${oldDy.toFixed(2)})变为(${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
        
        // 添加特效
        this.game.shakeScreen && this.game.shakeScreen(3, 100);
    }
    
    // 处理与砖块的碰撞
    handleBrickCollision(brick) {
        // 记录碰撞前状态
        const oldDx = this.dx;
        const oldDy = this.dy;
        const oldSpeed = this.speed;
        
        // 确定碰撞方向
        const hitFromBottom = this.y > brick.y + brick.height / 2;
        const hitFromTop = this.y < brick.y + brick.height / 2;
        
        // 垂直反弹
        if (hitFromBottom || hitFromTop) {
            this.dy = -this.dy;
        } else {
            // 水平反弹
            this.dx = -this.dx;
        }
        
        // 增加速度变化以增加游戏难度
        this.speed += 0.05;
        if (this.speed > 10) this.speed = 10; // 速度上限
        
        console.log(`小球碰撞砖块 - 位置: (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), 碰撞方向: ${hitFromTop ? '上' : hitFromBottom ? '下' : '侧面'}, 速度从${oldSpeed.toFixed(2)}变为${this.speed.toFixed(2)}, 方向从(${oldDx.toFixed(2)}, ${oldDy.toFixed(2)})变为(${this.dx.toFixed(2)}, ${this.dy.toFixed(2)})`);
    }
    
    // 响应式布局支持
    resize() {
        // 保存原始位置以记录变化
        const oldX = this.x;
        const oldY = this.y;
        
        // 确保小球在画布范围内
        this.x = Math.min(this.x, this.game.gameWidth - this.size);
        this.y = Math.min(this.y, this.game.gameHeight - this.size);
        
        if (this.x !== oldX || this.y !== oldY) {
            console.log(`小球位置调整 - 从(${oldX.toFixed(1)}, ${oldY.toFixed(1)})到(${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
        }
    }
}