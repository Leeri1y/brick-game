// 关卡配置常量
const BRICK_TYPE = {
    NORMAL: 1,
    STEEL: 2,
    POWERUP: 3,
    BOSS: 4
  };
  
  const POWERUP_TYPE = {
    EXTRA_BALL: 'multi-ball',
    EXPAND_PADDLE: 'expand',
    LASER: 'laser'
  };
  
  class Level {
    constructor(config) {
      this.number = config.number;
      this.bricks = [];
      this.boss = config.boss || null;
      this.background = config.background;
      this.generateBricks(config.layout);
      
      console.log(`关卡 ${this.number} 已创建，共 ${this.bricks.length} 个砖块`);
    }
  
    generateBricks(layout) {
      const rows = layout.length;
      const cols = layout[0].length;
      
      layout.forEach((row, rowIndex) => {
        row.forEach((brickCode, colIndex) => {
          if (brickCode === 0) return;
          
          const brick = {
            type: BRICK_TYPE.NORMAL,
            powerup: null,
            health: 1,
            x: colIndex * (100 / cols) + '%',
            y: rowIndex * 40 + 60,  // 距顶部偏移
            width: 100 / cols + '%',
            height: 30,
            active: true
          };
  
          // 解析砖块类型
          switch(brickCode) {
            case 'S':
              brick.type = BRICK_TYPE.STEEL;
              brick.health = 3;
              break;
            case 'P':
              brick.type = BRICK_TYPE.POWERUP;
              brick.powerup = this.randomPowerup();
              break;
            case 'B':
              brick.type = BRICK_TYPE.BOSS;
              brick.health = 15;
              brick.width = '30%';
              brick.height = 50;
              break;
          }
  
          this.bricks.push(brick);
        });
      });
    }
  
    randomPowerup() {
      const powerups = Object.values(POWERUP_TYPE);
      return powerups[Math.floor(Math.random() * powerups.length)];
    }
  }
  
  class LevelManager {
    constructor(game) {
      this.game = game;
      this.currentLevel = null;
      this.levels = this.createLevels();
      
      console.log(`关卡管理器已创建，共 ${this.levels.length} 个关卡`);
    }
  
    createLevels() {
      return [
        // 第1关 - 新手引导
        new Level({
          number: 1,
          background: '#ffd1dc',
          layout: [
            ['1', '1', '1', '1'],
            ['P', '0', '0', 'P'],
            ['1', 'S', 'S', '1']
          ]
        }),
  
        // 第2关 - 增加钢铁砖块
        new Level({
          number: 2,
          background: '#ffb3ba',
          layout: [
            ['S', '1', '1', 'S'],
            ['1', 'P', 'P', '1'],
            ['S', '1', '1', 'S']
          ]
        }),
  
        // 第5关 - BOSS战
        new Level({
          number: 5,
          background: '#ff8095',
          boss: {
            health: 100,
            pattern: 'laser-barrage',
            moveSpeed: 2
          },
          layout: [
            ['B', 'B', 'B']
          ]
        })
      ];
    }
  
    loadLevel(levelNumber) {
      console.log(`尝试加载关卡 ${levelNumber}`);
      
      const targetLevel = this.levels.find(l => l.number === levelNumber);
      if (!targetLevel) {
        console.error(`关卡 ${levelNumber} 未找到`);
        throw new Error(`Level ${levelNumber} not found`);
      }
  
      this.currentLevel = targetLevel;
      this.game.background = targetLevel.background;
      
      // 初始化BOSS
      if (targetLevel.boss) {
        this.initBoss(targetLevel.boss);
      }
  
      console.log(`关卡 ${levelNumber} 加载成功，砖块数量: ${this.currentLevel.bricks.length}`);
      
      // 重新调整砖块位置
      this.resize();
    }
  
    initBoss(bossConfig) {
      // BOSS实体生成逻辑
      const boss = {
        ...bossConfig,
        x: 35,
        y: 20,
        direction: 1,
        update: function() {
          // 左右移动逻辑
          this.x += this.direction * this.moveSpeed;
          if (this.x > 70 || this.x < 10) this.direction *= -1;
        }
      };
      
      this.game.boss = boss;
      console.log('BOSS已初始化');
    }
  
    resize() {
      if (!this.currentLevel) return;
      
      // 根据画布宽度重新计算砖块位置
      const canvasWidth = this.game.gameWidth;
      this.currentLevel.bricks.forEach(brick => {
        if (typeof brick.x === 'string') {
          // 保存实际像素位置（不使用_x，直接更新x）
          brick.x = canvasWidth * parseFloat(brick.x) / 100;
        }
        
        // 同样处理宽度
        if (typeof brick.width === 'string') {
          brick.width = canvasWidth * parseFloat(brick.width) / 100;
        }
      });
      
      console.log(`已调整砖块位置，画布宽度: ${canvasWidth}`);
    }

    // 绘制砖块
    draw(ctx) {
      if (!this.currentLevel) {
        console.warn('没有已加载的关卡，无法绘制');
        return;
      }

      // 绘制所有砖块
      this.currentLevel.bricks.forEach(brick => {
        if (!brick.active) return;

        // 直接使用砖块的x和width属性，不再需要计算
        const brickX = brick.x;
        const brickWidth = brick.width;

        // 根据砖块类型设置颜色
        let color;
        switch(brick.type) {
          case BRICK_TYPE.STEEL:
            color = '#a0a0a0';
            break;
          case BRICK_TYPE.POWERUP:
            color = '#ffcc00';
            break;
          case BRICK_TYPE.BOSS:
            color = '#ff4500';
            break;
          default:
            color = '#ff85a2';
        }

        // 绘制砖块
        ctx.fillStyle = color;
        ctx.fillRect(brickX, brick.y, brickWidth, brick.height);

        // 绘制砖块立体感
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brickX, brick.y, brickWidth, 5);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(brickX, brick.y + brick.height - 5, brickWidth, 5);

        // 绘制钢铁砖块的螺丝钉
        if (brick.type === BRICK_TYPE.STEEL) {
          ctx.fillStyle = '#808080';
          ctx.beginPath();
          ctx.arc(brickX + 10, brick.y + 10, 3, 0, Math.PI * 2);
          ctx.arc(brickX + brickWidth - 10, brick.y + 10, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 绘制道具砖块的闪光
        if (brick.type === BRICK_TYPE.POWERUP) {
          const time = Date.now() / 500;
          const glowSize = 5 + Math.sin(time) * 3;
          
          ctx.fillStyle = 'rgba(255, 255, 100, 0.6)';
          ctx.beginPath();
          ctx.arc(brickX + brickWidth/2, brick.y + brick.height/2, 
              glowSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 调试模式下显示砖块边界
        if (this.game.debugMode) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 1;
          ctx.strokeRect(brickX, brick.y, brickWidth, brick.height);
          
          // 显示砖块中心点
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(brickX + brickWidth/2, brick.y + brick.height/2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 绘制BOSS (如果存在)
      if (this.game.boss) {
        this.drawBoss(ctx);
      }
    }

    // 更新关卡状态
    update(deltaTime) {
      if (!this.currentLevel) return;

      // 检查是否所有砖块都被清除
      const remainingBricks = this.currentLevel.bricks.filter(b => b.active).length;
      
      if (remainingBricks === 0) {
        // 如果当前关卡是最后一关，则游戏胜利
        const nextLevelNum = this.currentLevel.number + 1;
        const nextLevel = this.levels.find(l => l.number === nextLevelNum);
        
        if (nextLevel) {
          // 加载下一关
          console.log(`当前关卡完成，准备加载下一关: ${nextLevelNum}`);
          setTimeout(() => {
            this.loadLevel(nextLevelNum);
            // 重置球和挡板
            this.game.ball.reset();
            this.game.player.reset();
          }, 1000);
        } else {
          // 游戏胜利
          console.log('游戏通关!');
          if (this.game.currentState !== 3) { // 不是游戏结束状态
            this.game.currentState = 3; // 设置为游戏结束状态
            this.game.showGameOverScreen && this.game.showGameOverScreen(true);
          }
        }
      }

      // 更新BOSS (如果存在)
      if (this.game.boss) {
        this.game.boss.update();
      }
    }

    // 绘制BOSS
    drawBoss(ctx) {
      const boss = this.game.boss;
      const bossWidth = this.game.gameWidth * 0.3;
      const bossHeight = 50;
      const bossX = this.game.gameWidth * (boss.x / 100);
      
      // 绘制BOSS主体
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(bossX, boss.y, bossWidth, bossHeight);
      
      // 绘制BOSS装甲
      ctx.fillStyle = '#ff6347';
      ctx.fillRect(bossX + 10, boss.y + 10, bossWidth - 20, bossHeight - 20);
      
      // 绘制BOSS发光效果
      const time = Date.now() / 300;
      const glowOpacity = 0.3 + Math.sin(time) * 0.2;
      
      ctx.fillStyle = `rgba(255, 255, 0, ${glowOpacity})`;
      ctx.beginPath();
      ctx.arc(bossX + bossWidth/2, boss.y + bossHeight/2, 
          20 + Math.sin(time) * 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制BOSS生命值
      const healthPercent = boss.health / 100;
      const healthBarWidth = bossWidth * healthPercent;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(bossX, boss.y - 15, bossWidth, 10);
      
      ctx.fillStyle = `hsl(${healthPercent * 120}, 80%, 50%)`;
      ctx.fillRect(bossX, boss.y - 15, healthBarWidth, 10);
    }
  }
  
  // export { BRICK_TYPE };
  // 不要删除这行，确保BRICK_TYPE可以全局访问
  