// src/js/score.js
export class ScoreSystem {
    constructor(game) {
      this.game = game;
      this.dailyChallenge = new DailyChallenge(this);
      this.reset();
  
      // 成就配置
      this.achievements = {
        firstBlood: { unlocked: false, condition: () => this.totalScore >= 100 },
        comboMaster: { unlocked: false, condition: () => this.maxCombo >= 10 },
        billionaire: { unlocked: false, condition: () => this.coins >= 1000 }
      };
  
      // 初始化本地存储
      this.loadFromStorage();
    }
  
    reset() {
      this.totalScore = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.coins = 0;
      this.comboTimeout = null;
      this.comboMultiplier = 1;
      this.lastHitTime = 0;
    }
  
    // 得分计算核心逻辑
    addScore(basePoints) {
      const comboBonus = Math.floor(this.combo / 5);
      const total = (basePoints + comboBonus) * this.comboMultiplier;
  
      this.totalScore += total;
      this.coins += Math.floor(total / 10);
      
      this.updateCombo();
      this.checkAchievements();
      this.saveToStorage();
      if (this.dailyChallenge && typeof this.dailyChallenge.updateProgress === 'function') {
        this.dailyChallenge.updateProgress('score', basePoints);
      }
    }
  
    // 连击管理系统
    updateCombo() {
      this.combo++;
      this.maxCombo = Math.max(this.combo, this.maxCombo);
      this.lastHitTime = Date.now();
  
      // 连击加成阶梯
      this.comboMultiplier = 1 + Math.floor(this.combo / 3) * 0.5;
  
      // 清除旧的连击计时
      if (this.comboTimeout) clearTimeout(this.comboTimeout);
      
      // 设置连击失效计时
      this.comboTimeout = setTimeout(() => {
        this.combo = 0;
        this.comboMultiplier = 1;
      }, 3000);
    }

    // 增加连击
    addCombo() {
      this.combo++;
      this.maxCombo = Math.max(this.combo, this.maxCombo);
      this.lastHitTime = Date.now();

      // 连击加成阶梯
      this.comboMultiplier = 1 + Math.floor(this.combo / 3) * 0.5;

      // 清除旧的连击计时
      if (this.comboTimeout) clearTimeout(this.comboTimeout);
      
      // 设置连击失效计时
      this.comboTimeout = setTimeout(() => {
        this.combo = 0;
        this.comboMultiplier = 1;
      }, 3000);

      // 显示连击文本
      if (this.combo > 1 && this.game.showFloatingText) {
        const comboText = `${this.combo} 连击!`;
        const comboColor = this.combo >= 10 ? '#ffcc00' : 
                           this.combo >= 5 ? '#ff6b8e' : '#ffffff';
        
        this.game.showFloatingText(comboText, comboColor, 1000);

        // 连击达到里程碑时的特效
        if (this.combo === 5 || this.combo === 10 || this.combo === 20) {
          this.game.shakeScreen(this.combo / 2, 300);
        }
      }
    }
  
    // 金币消费逻辑
    spendCoins(amount) {
      if (this.coins >= amount) {
        this.coins -= amount;
        this.saveToStorage();
        return true;
      }
      return false;
    }
  
    // 成就系统
    checkAchievements() {
      Object.entries(this.achievements).forEach(([key, achievement]) => {
        if (!achievement.unlocked && achievement.condition()) {
          achievement.unlocked = true;
          this.unlockAchievement(key);
        }
      });
    }
  
    unlockAchievement(name) {
      const achievementNames = {
        firstBlood: '初露锋芒! 获得100分',
        comboMaster: '连击达人! 达成10连击',
        billionaire: '金币大亨! 积累1000金币'
      };
      
      if (this.game.showFloatingText) {
        this.game.showFloatingText(achievementNames[name], '#gold');
      }
      this.coins += 200; // 成就奖励金币
    }
  
    // 本地排行榜
    updateLeaderboard() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const dailyEntry = {
          date: today,
          score: this.totalScore,
          seed: this.generateDailySeed()
        };
    
        // 获取历史记录
        const allTimeBest = localStorage.getItem('allTimeBest') || 0;
        const dailyBest = JSON.parse(localStorage.getItem(today) || '{}');
    
        // 更新记录
        if (this.totalScore > allTimeBest) {
          localStorage.setItem('allTimeBest', this.totalScore);
        }
    
        if (this.totalScore > (dailyBest.score || 0)) {
          localStorage.setItem(today, JSON.stringify(dailyEntry));
        }
      } catch (e) {
        console.error('更新排行榜失败', e);
      }
    }
  
    // 每日挑战种子生成
    generateDailySeed() {
      const today = new Date();
      return Number(
        `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate()}`
      );
    }
  
    // 本地存储管理
    saveToStorage() {
      try {
        localStorage.setItem('gameProgress', JSON.stringify({
          coins: this.coins,
          achievements: this.achievements
        }));
      } catch (e) {
        console.error('保存游戏进度失败', e);
      }
    }
  
    loadFromStorage() {
      try {
        const saved = JSON.parse(localStorage.getItem('gameProgress'));
        if (saved) {
          this.coins = saved.coins || 0;
          Object.entries(saved.achievements || {}).forEach(([key, val]) => {
            if (this.achievements[key]) this.achievements[key].unlocked = val;
          });
        }
      } catch (e) {
        console.error('加载游戏进度失败', e);
      }
    }
  
    // UI更新接口
    updateCoinDisplay() {
      document.getElementById('coins').textContent = this.coins;
    }

    // 新增砖块击破记录
    recordBrickBreak() {
      if (this.dailyChallenge && typeof this.dailyChallenge.updateProgress === 'function') {
        this.dailyChallenge.updateProgress('bricks');
      }
    }

    // 新增BOSS击败记录
    recordBossDefeat() {
      if (this.dailyChallenge && typeof this.dailyChallenge.updateProgress === 'function') {
        this.dailyChallenge.updateProgress('boss');
      }
    }
  }

  class DailyChallenge {
    constructor(scoreSystem) {
      this.scoreSystem = scoreSystem;
      this.currentChallenge = null;
      this.progress = 0;
      this.seed = this.generateDailySeed();
    }
  
    // 生成每日挑战（包含5种随机类型）
    generateChallenge() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const challengeTypes = [
          {
            type: 'score',
            target: 5000 + Math.floor(this.seed % 3000),
            reward: 500,
            description: `今日目标：获得${this.formatNumber(5000 + Math.floor(this.seed % 3000))}分`
          },
          {
            type: 'combo',
            target: 8 + Math.floor(this.seed % 5),
            reward: 300,
            description: `达成${8 + Math.floor(this.seed % 5)}连击`
          },
          {
            type: 'bricks',
            target: 50 + Math.floor(this.seed % 30),
            reward: 400,
            description: `击碎${50 + Math.floor(this.seed % 30)}块砖`
          },
          {
            type: 'boss',
            target: 1,
            reward: 800,
            description: '击败1个BOSS'
          },
          {
            type: 'powerups',
            target: 5 + Math.floor(this.seed % 4),
            reward: 350,
            description: `收集${5 + Math.floor(this.seed % 4)}个道具`
          }
        ];
    
        // 根据种子选择挑战类型
        this.currentChallenge = challengeTypes[this.seed % challengeTypes.length];
        this.currentChallenge.date = today;
        this.progress = 0;
    
        // 保存到本地存储
        try {
          localStorage.setItem(`dailyChallenge_${today}`, JSON.stringify({
            challenge: this.currentChallenge,
            progress: this.progress,
            seed: this.seed
          }));
        } catch (e) {
          console.error('保存每日挑战失败', e);
        }
    
        return this.currentChallenge;
      } catch (e) {
        console.error('生成每日挑战失败', e);
        return null;
      }
    }
  
    // 检查本地是否有今日挑战
    loadTodayChallenge() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const saved = JSON.parse(localStorage.getItem(`dailyChallenge_${today}`));
    
        if (saved && saved.challenge.date === today) {
          this.currentChallenge = saved.challenge;
          this.progress = saved.progress;
          this.seed = saved.seed || this.generateDailySeed();
          return true;
        }
        return false;
      } catch (e) {
        console.error('加载每日挑战失败', e);
        return false;
      }
    }
  
    // 更新挑战进度
    updateProgress(type, amount = 1) {
      if (!this.currentChallenge || this.currentChallenge.type !== type) return;
  
      this.progress += amount;
      this.saveProgress();
  
      // 检查是否完成
      if (this.progress >= this.currentChallenge.target) {
        this.rewardPlayer();
        return true;
      }
      return false;
    }
  
    // 发放奖励
    rewardPlayer() {
      this.scoreSystem.coins += this.currentChallenge.reward;
      this.scoreSystem.saveToStorage();
      
      // 显示完成特效
      if (this.scoreSystem.game.showFloatingText) {
        this.scoreSystem.game.showFloatingText(
          `挑战完成! +${this.currentChallenge.reward}金币`, 
          '#FFD700',
          2000
        );
      }
      
      // 标记为已完成
      this.currentChallenge.completed = true;
      this.saveProgress();
    }
  
    // 生成基于日期的种子
    generateDailySeed() {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return parseInt(dateStr, 10);
    }
  
    // 保存进度
    saveProgress() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`dailyChallenge_${today}`, JSON.stringify({
          challenge: this.currentChallenge,
          progress: this.progress,
          seed: this.seed
        }));
      } catch (e) {
        console.error('保存挑战进度失败', e);
      }
    }
  
    // 数字格式化
    formatNumber(num) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }
  
  export default ScoreSystem;
