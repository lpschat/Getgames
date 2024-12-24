class GamePlatform {
    constructor() {
        this.games = [];
        this.modal = new bootstrap.Modal(document.getElementById('gameModal'));
        this.initializeEventListeners();
    }

    async initialize() {
        try {
            await this.loadGames();
            this.renderGames(this.games);
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    async loadGames() {
        const response = await fetch('https://002001a.oss-accelerate.aliyuncs.com/b/WenJian.json');
        const data = await response.json();

        this.games = await Promise.all(data.Content.map(async item => ({
            name1: await GameCrypto.decrypt(item.Name1),
            name2: await GameCrypto.decrypt(item.Name2),
            bh: await GameCrypto.decrypt(item.BH),
            mm: await GameCrypto.decrypt(item.MM),
            xingj: await GameCrypto.decrypt(item.XingJ)
        })));
    }

    async loadGameImage(bh) {
        try {
            // 获取游戏的 INI 文件
            const iniUrl = `https://002001a.oss-accelerate.aliyuncs.com/c/${bh}.txt`;
            const response = await fetch(iniUrl);
            const encryptedData = await response.arrayBuffer();
            const decryptedData = this.decryptIni(new Uint8Array(encryptedData));
            const gameInfo = this.parseIni(decryptedData);

            // 更新图片 URL
            const imageUrl = gameInfo.C1.sc2;
            const imgElements = document.querySelectorAll(`img[data-bh="${bh}"]`);
            imgElements.forEach(img => {
                img.src = imageUrl;
            });
        } catch (error) {
            console.error(`加载游戏图片失败 (BH: ${bh}):`, error);
        }
    }

    renderGames(games) {
        const container = document.getElementById('gameGrid');
        container.innerHTML = games.map(game => this.createGameCard(game)).join('');

        // 加载所有游戏图片
        games.forEach(game => {
            this.loadGameImage(game.bh);
        });
    }

    createGameCard(game) {
        return `
            <div class="col-md-3 col-sm-6">
                <div class="game-card" data-bh="${game.bh}">
                    <div class="game-image-container">
                        <div class="image-placeholder"></div>
                        <img src="" 
                             class="game-image" 
                             alt="${game.name1}"
                             loading="lazy"
                             data-bh="${game.bh}"
                             onload="this.classList.add('loaded')"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'16\'%3E暂无图片%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div class="game-title">${game.name1}</div>
                    <div class="rating">${this.getStarRating(parseFloat(game.xingj))}</div>
                </div>
            </div>
        `;
    }

    getStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '');
    }

    async showGameDetails(bh) {
        try {
            const iniUrl = `https://002001a.oss-accelerate.aliyuncs.com/c/${bh}.txt`;
            const response = await fetch(iniUrl);
            const encryptedData = await response.arrayBuffer();

            // 解密INI数据
            const decryptedData = this.decryptIni(new Uint8Array(encryptedData));
            const gameInfo = this.parseIni(decryptedData);

            this.updateModalContent(gameInfo);
            this.modal.show();
        } catch (error) {
            console.error('加载游戏详情失败:', error);
        }
    }

    initializeEventListeners() {
        document.getElementById('gameGrid').addEventListener('click', e => {
            const card = e.target.closest('.game-card');
            if (card) {
                this.showGameDetails(card.dataset.bh);
            }
        });

        document.getElementById('searchInput').addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredGames = this.games.filter(game =>
                game.name1.toLowerCase().includes(searchTerm) ||
                game.name2.toLowerCase().includes(searchTerm)
            );
            this.renderGames(filteredGames);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const platform = new GamePlatform();
    platform.initialize();
});