import { PowerupManager } from './powerups.js';
import { Player } from './player.js';
import ScoreSystem from './score.js';
import { GameUtils, initUtils } from './utils.js';
import { Ball } from './ball.js';
import { LevelManager } from './levels.js';

export class BrickGame {
    constructor() {
        // 添加调试模式标志
        this.debugMode = false;
        
        // 先初始化画布
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置游戏尺寸
        this.resize();
        
        // 再初始化游戏对象
        this.initGameObjects();
        
        // 最后绑定事件
        this.bindEvents();

        // 绑定首页按钮
        document.getElementById('startBtn').addEventListener('click', () => {
            document.getElementById('startMenu').style.display = 'none';
            this.startGame();
        });

        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            document.getElementById('howToPlay').style.display = 'block';
        });

        document.getElementById('closeHowToPlayBtn').addEventListener('click', () => {
            document.getElementById('howToPlay').style.display = 'none';
        });

        // 设置游戏默认显示开始菜单
        document.getElementById('startMenu').style.display = 'block';
        document.getElementById('howToPlay').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';

        // 添加调试按钮
        this.addDebugControls();

        console.log('游戏初始化完成');
    }

    // 添加调试控制
    addDebugControls() {
        // 创建调试按钮
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '调试模式';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '1000';
        debugBtn.style.padding = '5px 10px';
        debugBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        debugBtn.style.color = 'white';
        debugBtn.style.border = '1px solid white';
        debugBtn.style.borderRadius = '5px';
        
        debugBtn.addEventListener('click', () => {
            this.debugMode = !this.debugMode;
            debugBtn.textContent = this.debugMode ? '退出调试模式' : '调试模式';
            console.log(`调试模式: ${this.debugMode ? '开启' : '关闭'}`);
            
            // 显示或隐藏调试信息面板
            const debugPanel = document.getElementById('gameDebugInfo');
            if (debugPanel) {
                debugPanel.style.display = this.debugMode ? 'block' : 'none';
            }
            
            // 如果开启调试模式，添加一些日志
            if (this.debugMode) {
                console.log('游戏状态:', this.currentState);
                console.log('画布尺寸:', this.gameWidth, 'x', this.gameHeight);
                console.log('玩家:', this.player);
                console.log('小球:', this.ball);
                console.log('当前关卡:', this.levelManager.currentLevel);
                this.updateDebugInfo();
            }
        });
        
        document.body.appendChild(debugBtn);
        
        // 初始化调试信息面板
        this.initDebugInfoPanel();
    }
    
    // 初始化调试信息面板
    initDebugInfoPanel() {
        const debugPanel = document.getElementById('gameDebugInfo');
        if (!debugPanel) return;
        
        // 设置样式（备用，以防CSS未加载）
        debugPanel.style.position = 'absolute';
        debugPanel.style.bottom = '10px';
        debugPanel.style.left = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        debugPanel.style.color = '#fff';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.fontSize = '12px';
        debugPanel.style.maxWidth = '300px';
        debugPanel.style.display = 'none';
        debugPanel.style.zIndex = '1000';
    }
    
    // 更新调试信息
    updateDebugInfo() {
        if (!this.debugMode) return;
        
        const debugPanel = document.getElementById('gameDebugInfo');
        if (!debugPanel) return;
        
        // 创建调试信息
        let info = '';
        info += `<b>游戏状态:</b> ${Object.keys(this.states)[this.currentState]}<br>`;
        info += `<b>FPS:</b> ${this._perf.fps}<br>`;
        info += `<b>画布尺寸:</b> ${this.gameWidth}x${this.gameHeight}<br>`;
        
        if (this.ball) {
            info += `<b>小球:</b> (${this.ball.x.toFixed(1)}, ${this.ball.y.toFixed(1)})<br>`;
            info += `<b>速度:</b> ${this.ball.speed.toFixed(1)}, 方向: (${this.ball.dx.toFixed(1)}, ${this.ball.dy.toFixed(1)})<br>`;
            info += `<b>状态:</b> ${this.ball.active ? '活跃' : '不活跃'}<br>`;
        }
        
        if (this.player) {
            info += `<b>挡板:</b> (${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)})<br>`;
            info += `<b>宽度:</b> ${this.player.width}, 高度: ${this.player.height}<br>`;
            info += `<b>激光:</b> ${this.player.laserEnabled ? '已激活' : '未激活'}<br>`;
        }
        
        if (this.levelManager && this.levelManager.currentLevel) {
            const bricksLeft = this.levelManager.currentLevel.bricks.filter(b => b.active).length;
            const totalBricks = this.levelManager.currentLevel.bricks.length;
            info += `<b>关卡:</b> ${this.levelManager.currentLevel.number}<br>`;
            info += `<b>砖块:</b> ${bricksLeft}/${totalBricks}<br>`;
        }
        
        // 更新HTML内容
        debugPanel.innerHTML = info;
    }

    initGameObjects() {
        // 初始化游戏尺寸
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
          
        // 性能监控
        this._perf = {
            lastFPSUpdate: 0,
            frameCount: 0,
            fps: 0
        };
  
        // 错误边界
        this._errorHandler = (err) => {
            console.error('[Game Error]', err);
            this.showErrorScreen(err);
        };

        // 游戏状态管理
        this.states = {
            START: 0,
            PLAYING: 1,
            PAUSED: 2,
            GAMEOVER: 3
        };
        this.currentState = this.states.START;

        // 初始化时强制隐藏暂停菜单
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('howToPlay').style.display = 'none';
  
        // 初始化核心游戏对象
        this.player = new Player(this);
        this.ball = new Ball(this);
        this.levelManager = new LevelManager(this);
        this.powerupManager = new PowerupManager(this);
        this.scoreSystem = new ScoreSystem(this);
  
        // 游戏参数
        this.FPS = 60;
        this.lastTime = 0;
        this.deltaTime = 0;

        // 初始化工具
        initUtils(this);

        // 初始显示开始菜单
        document.getElementById('startMenu').style.display = 'block';
        
        console.log('游戏对象初始化完成');
    }
  
    // 初始化事件监听
    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => this.resize());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentState === this.states.PLAYING) {
                this.pauseGame();
            }
        });
  
        // 移动端触摸事件
        this.canvas.addEventListener('touchstart', e => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', e => this.handleTouch(e));
        
        // 鼠标控制事件
        this.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
        this.canvas.addEventListener('click', e => this.handleMouseClick(e));
  
        // 键盘控制
        document.addEventListener('keydown', e => {
            if (this.currentState !== this.states.PLAYING) return;
            
            if (e.key === 'ArrowLeft') this.player.moveLeft();
            if (e.key === 'ArrowRight') this.player.moveRight();
            if (e.key === 'Escape') this.togglePause();
            
            // 调试用的按键
            if (this.debugMode) {
                if (e.key === 'd') console.log('当前游戏状态:', this.currentState);
                if (e.key === 'n' && this.levelManager.currentLevel) {
                    const nextLevel = this.levelManager.currentLevel.number + 1;
                    try {
                        this.levelManager.loadLevel(nextLevel);
                        console.log(`跳转到关卡 ${nextLevel}`);
                    } catch (e) {
                        console.error('无法跳转到下一关:', e);
                    }
                }
                if (e.key === 'l') this.player.laserEnabled = !this.player.laserEnabled;
            }
        });

        // 暂停菜单按钮
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.currentState = this.states.START;
            document.getElementById('pauseMenu').style.display = 'none';
            document.getElementById('startMenu').style.display = 'block';
        });
        
        console.log('事件绑定完成');
    }

    // 处理鼠标移动
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // 只有在游戏中才移动挡板
        if (this.currentState === this.states.PLAYING) {
            this.player.x = mouseX - this.player.width / 2;
            
            // 确保挡板在画布范围内
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.gameWidth) {
                this.player.x = this.gameWidth - this.player.width;
            }
            
            if (this.debugMode) {
                console.log(`鼠标位置: ${mouseX}, 挡板位置: ${this.player.x}`);
            }
        }
    }
    
    // 处理鼠标点击
    handleMouseClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (this.debugMode) {
            console.log(`鼠标点击 - 位置: (${mouseX}, ${mouseY}), 当前游戏状态: ${this.currentState}`);
        }
        
        // 在游戏结束状态时，点击返回主菜单
        if (this.currentState === this.states.GAMEOVER) {
            this.currentState = this.states.START;
            document.getElementById('startMenu').style.display = 'block';
            console.log('从游戏结束状态返回主菜单');
        }
        
        // 在游戏进行中，可以添加特殊点击动作，比如发射技能等
        if (this.currentState === this.states.PLAYING) {
            // 如果有laser技能可以在这里触发
            if (this.player.laserEnabled) {
                this.player.fireLaser();
                console.log('发射激光');
            }
        }
    }
  
    // 响应式布局
    resize() {
        const oldWidth = this.gameWidth;
        const oldHeight = this.gameHeight;
        
        this.gameWidth = Math.min(window.innerWidth - 40, 600);
        this.gameHeight = window.innerHeight * 0.8;
      
        this.canvas.width = this.gameWidth;
        this.canvas.height = this.gameHeight;
      
        // 如果已经初始化了游戏对象，则调整它们的大小
        if (this.player) this.player.resize();
        if (this.ball) this.ball.resize();
        if (this.levelManager) this.levelManager.resize();
        
        console.log(`画布大小改变，从 ${oldWidth}x${oldHeight} 到 ${this.gameWidth}x${this.gameHeight}`);
    }
  
    // 游戏循环
    gameLoop(timestamp) {
        // 计算时间增量
        const now = timestamp || performance.now();
        this.deltaTime = now - (this.lastTime || now);
        this.lastTime = now;

        // 防止deltaTime过大导致游戏异常
        if (this.deltaTime > 100) this.deltaTime = 16.67;

        try {
            // 如果在游戏状态中才更新游戏
            if (this.currentState === this.states.PLAYING) {
                this.update(this.deltaTime);
            }
            
            // 绘制游戏画面
            this.draw();
            
            // FPS计算
            this._perf.frameCount++;
            if (now - this._perf.lastFPSUpdate > 1000) {
                this._perf.fps = this._perf.frameCount;
                this._perf.frameCount = 0;
                this._perf.lastFPSUpdate = now;
            }
            
            // 继续游戏循环
            requestAnimationFrame(t => this.gameLoop(t));
        } catch (err) {
            console.error('游戏循环错误:', err);
            // 防止游戏崩溃，继续游戏循环
            requestAnimationFrame(t => this.gameLoop(t));
        }
    }
  
    // 更新游戏状态
    update(deltaTime) {
        // 更新游戏对象
        this.player.update(deltaTime);
        this.ball.update(deltaTime);
        this.powerupManager.update(deltaTime);
        this.levelManager.update(deltaTime);
        this.checkCollisions();

        // 更新工具
        GameUtils.update(deltaTime);
    }
  
    // 碰撞检测
    checkCollisions() {
        if (!this.levelManager.currentLevel) return;

        // 球与挡板碰撞
        if (this.ball.active && this.ball.collideWith(this.player)) {
            this.ball.handlePaddleCollision(this.player);
            this.scoreSystem.addCombo();
        }
  
        // 球与砖块碰撞
        this.levelManager.currentLevel.bricks.forEach(brick => {
            if (brick.active && this.ball.active && this.ball.collideWith(brick)) {
                // 减少砖块生命值
                brick.health -= 1;
                if (brick.health <= 0) {
                    brick.active = false;
                    this.handleBrickDestroyed(brick);
                }

                this.ball.handleBrickCollision(brick);
                this.scoreSystem.addScore(10); // 基础分数
                
                // 如果是道具砖块并且被完全击碎，生成道具
                if (brick.type === 3 && !brick.active && brick.powerup) {
                    this.powerupManager.spawnPowerup(brick.x, brick.y, brick.powerup);
                }
            }
        });
    }
  
    // 绘制游戏元素
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
      
        // 绘制游戏元素
        this.levelManager.draw(this.ctx);
        this.player.draw(this.ctx);
        this.ball.draw(this.ctx);
        this.powerupManager.draw(this.ctx);

        // 绘制工具系统的效果
        GameUtils.draw(this.ctx);

        // 绘制UI
        this.drawUI();
        
        // 绘制调试信息
        this.drawDebugInfo();
    }
  
    // 绘制游戏UI
    drawUI() {
        // 分数显示
        this.ctx.font = '18px "Ma Shan Zheng"';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`分数: ${this.scoreSystem.totalScore}`, 10, 30);
      
        // 连击显示
        if (this.scoreSystem.combo > 1) {
            this.ctx.fillStyle = '#ff69b4';
            this.ctx.fillText(`${this.scoreSystem.combo}连击!`, 10, 60);
        }

        // 更新UI元素
        if (document.getElementById('score')) {
            document.getElementById('score').textContent = this.scoreSystem.totalScore;
        }
        if (document.getElementById('coins')) {
            document.getElementById('coins').textContent = this.scoreSystem.coins;
        }
    }
    
    // 绘制调试信息
    drawDebugInfo() {
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        // FPS和游戏状态
        this.ctx.fillText(`FPS: ${this._perf.fps}`, 10, this.gameHeight - 60);
        this.ctx.fillText(`状态: ${Object.keys(this.states)[this.currentState]}`, 10, this.gameHeight - 45);
        
        // 小球信息
        this.ctx.fillText(`小球: (${this.ball.x.toFixed(1)}, ${this.ball.y.toFixed(1)}) 速度: ${this.ball.speed.toFixed(1)}`, 10, this.gameHeight - 30);
        
        // 挡板信息
        this.ctx.fillText(`挡板: (${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}) 宽度: ${this.player.width}`, 10, this.gameHeight - 15);
        
        // 关卡信息
        if (this.levelManager.currentLevel) {
            const bricksLeft = this.levelManager.currentLevel.bricks.filter(b => b.active).length;
            this.ctx.fillText(`关卡: ${this.levelManager.currentLevel.number}, 剩余砖块: ${bricksLeft}`, this.gameWidth - 200, 30);
        }
        
        // 绘制网格线作为参考
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        
        // 垂直线
        for (let x = 0; x <= this.gameWidth; x += 50) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.gameHeight);
        }
        
        // 水平线
        for (let y = 0; y <= this.gameHeight; y += 50) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.gameWidth, y);
        }
        
        this.ctx.stroke();
        
        // 更新HTML调试面板
        this.updateDebugInfo();
    }
  
    // 开始游戏
    startGame() {
        console.log('开始游戏');
        this.currentState = this.states.PLAYING;

        // 隐藏开始菜单
        document.getElementById('startMenu').style.display = 'none';

        // 重置球和挡板位置
        this.ball.reset();
        this.player.reset();
        this.scoreSystem.reset();
        this.levelManager.loadLevel(1);
        
        // 确保首先启动游戏循环
        if (!this.lastTime) {
            console.log('启动游戏循环');
            this.gameLoop(0);
        }
        
        // 显示一个开始游戏的提示
        this.showFloatingText('游戏开始!', '#ffffff', 1500);
    }

    // 暂停游戏
    pauseGame() {
        if (this.currentState === this.states.PLAYING) {
            this.currentState = this.states.PAUSED;
            const pauseMenu = document.getElementById('pauseMenu');
            if (pauseMenu) {
                pauseMenu.style.display = 'block';
            }
            console.log('游戏已暂停');
        }
    }

    // 暂停/继续游戏
    togglePause() {
        if (this.currentState === this.states.PLAYING) {
            this.pauseGame();
        } else if (this.currentState === this.states.PAUSED) {
            this.currentState = this.states.PLAYING;
            const pauseMenu = document.getElementById('pauseMenu');
            if (pauseMenu) {
                pauseMenu.style.display = 'none';
            }
            console.log('游戏已继续');
        }
    }

    // 重新开始游戏
    restartGame() {
        document.getElementById('pauseMenu').style.display = 'none';
        console.log('重新开始游戏');
        this.startGame();
    }

    // 处理球丢失
    handleBallLost(ball) {
        console.log('球丢失了');
        // 实现游戏结束逻辑
        this.currentState = this.states.GAMEOVER;
        this.showGameOverScreen(false);
    }

    // 处理砖块被摧毁
    handleBrickDestroyed(brick) {
        // 计算砖块的实际位置
        const brickX = typeof brick.x === 'string' 
            ? this.gameWidth * (parseFloat(brick.x) / 100)
            : brick.x;
          
        const brickWidth = typeof brick.width === 'string'
            ? this.gameWidth * (parseFloat(brick.width) / 100)
            : brick.width;

        console.log(`砖块被摧毁 - 位置: (${brickX}, ${brick.y}), 类型: ${brick.type}`);

        // 创建粒子效果
        if (typeof GameUtils.createParticles === 'function') {
            GameUtils.createParticles(
                brickX + brickWidth/2, 
                brick.y + brick.height/2, 
                { count: 10, color: '#ff85a2' }
            );
        }

        // 屏幕轻微震动
        if (typeof GameUtils.shakeScreen === 'function') {
            GameUtils.shakeScreen(3, 200);
        }

        // 更新分数和记录
        if (typeof this.scoreSystem.recordBrickBreak === 'function') {
            this.scoreSystem.recordBrickBreak();
        }
    }

    // 显示游戏结束画面
    showGameOverScreen(isWin) {
        // 简单的游戏结束提示
        const message = isWin ? '恭喜通关！' : '游戏结束';
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        
        this.ctx.font = '30px "Ma Shan Zheng"';
        this.ctx.fillStyle = isWin ? '#ffcc00' : '#ff4040';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.gameWidth/2, this.gameHeight/2 - 30);
        
        this.ctx.font = '20px "Ma Shan Zheng"';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`最终得分: ${this.scoreSystem.totalScore}`, this.gameWidth/2, this.gameHeight/2 + 10);
        this.ctx.fillText('点击任意位置返回主菜单', this.gameWidth/2, this.gameHeight/2 + 50);
        
        console.log(`游戏结束, ${isWin ? '胜利' : '失败'}, 得分: ${this.scoreSystem.totalScore}`);
        
        // 更新排行榜
        if (typeof this.scoreSystem.updateLeaderboard === 'function') {
            this.scoreSystem.updateLeaderboard();
        }
    }

    // 处理触摸事件
    handleTouch(e) {
        e.preventDefault(); // 防止滚动
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        
        if (this.debugMode) {
            console.log(`触摸事件 - 位置: ${x}, 类型: ${e.type}`);
        }
        
        // 更新挡板位置
        this.player.handleTouch(e);
    }

    // 显示浮动文本
    showFloatingText(text, color = '#ffffff', duration = 1500) {
        if (typeof GameUtils.showFloatingText === 'function') {
            GameUtils.showFloatingText(text, {
                position: { x: this.gameWidth/2, y: this.gameHeight/2 },
                color: color,
                duration: duration
            });
        }
    }

    // 屏幕震动效果
    shakeScreen(intensity, duration) {
        if (typeof GameUtils.shakeScreen === 'function') {
            GameUtils.shakeScreen(intensity, duration);
        }
    }

    // 错误屏幕显示
    showErrorScreen(error) {
        console.error('游戏错误:', error);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        
        this.ctx.font = '24px "Ma Shan Zheng"';
        this.ctx.fillStyle = '#ff4040';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏发生错误', this.gameWidth/2, this.gameHeight/2 - 30);
        
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(error.message || '未知错误', this.gameWidth/2, this.gameHeight/2 + 10);
        this.ctx.fillText('请刷新页面重试', this.gameWidth/2, this.gameHeight/2 + 40);
    }
}

// 启动游戏
window.addEventListener('load', () => {
    console.log('页面加载完成，初始化游戏');
    new BrickGame();
});
