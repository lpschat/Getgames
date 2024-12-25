class GamePlatform {
    constructor() {
        this.games = [];
        this.modal = new bootstrap.Modal(document.getElementById('gameModal'));
        this.initializeEventListeners();
        this.currentPage = 1;
        this.gamesPerPage = 12; // 每页显示12个游戏
        this.filteredGames = []; // 用于存储搜索过滤后的游戏
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
        try {
            const proxyUrl = 'https://getgames.llpplplp.workers.dev/games';
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            this.games = await Promise.all(data.Content.map(async item => {
                try {
                    return {
                        name1: await GameCrypto.decrypt(item.Name1),
                        name2: await GameCrypto.decrypt(item.Name2),
                        bh: await GameCrypto.decrypt(item.BH),
                        mm: await GameCrypto.decrypt(item.MM),
                        xingj: await GameCrypto.decrypt(item.XingJ)
                    };
                } catch (decryptError) {
                    console.error('游戏数据解密失败:', decryptError);
                    // 返回未解密的数据作为后备
                    return {
                        name1: item.Name1,
                        name2: item.Name2,
                        bh: item.BH,
                        mm: item.MM,
                        xingj: item.XingJ
                    };
                }
            }));
        } catch (error) {
            console.error('加载游戏列表失败:', error);
            throw error;
        }
    }

    async loadGameImage(bh) {
        try {
            const proxyUrl = `https://getgames.llpplplp.workers.dev/game/${bh}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const encryptedData = await response.arrayBuffer();
            // 解密INI文件
            const decryptedContent = GameCrypto.decryptIni(new Uint8Array(encryptedData));
            // 解析INI内容
            const gameInfo = GameCrypto.parseIni(decryptedContent);

            // 获取图片URL
            if (gameInfo.C1 && gameInfo.C1.sc2) {
                const imageUrl = gameInfo.C1.sc2;
                const imgElements = document.querySelectorAll(`img[data-bh="${bh}"]`);
                imgElements.forEach(img => {
                    img.src = imageUrl;
                });
            }
        } catch (error) {
            console.error(`加载游戏图片失败 (BH: ${bh}):`, error);
        }
    }

    renderGames(games) {
        this.filteredGames = games; // 保存过滤后的游戏列表
        const startIndex = (this.currentPage - 1) * this.gamesPerPage;
        const endIndex = startIndex + this.gamesPerPage;
        const gamesToShow = games.slice(startIndex, endIndex);

        const container = document.getElementById('gameGrid');
        container.innerHTML = gamesToShow.map(game => this.createGameCard(game)).join('');

        // 加载当前页面的游戏图片
        gamesToShow.forEach(game => {
            this.loadGameImage(game.bh);
        });

        // 渲染分页控件
        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredGames.length / this.gamesPerPage);
        const paginationContainer = document.getElementById('pagination');

        let paginationHtml = `
            <nav aria-label="游戏列表分页">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">上一页</a>
                    </li>
        `;

        // 显示页码
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                paginationHtml += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (
                i === this.currentPage - 3 ||
                i === this.currentPage + 3
            ) {
                paginationHtml += `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            }
        }

        paginationHtml += `
                <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${this.currentPage + 1}">下一页</a>
                </li>
            </ul>
        </nav>
        `;

        paginationContainer.innerHTML = paginationHtml;
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
            const iniUrl = `https://getgames.llpplplp.workers.dev/game/${bh}`;
            const response = await fetch(iniUrl);
            const encryptedData = await response.arrayBuffer();

            // 解密INI数据
            const decryptedData = GameCrypto.decryptIni(new Uint8Array(encryptedData));
            const gameInfo = GameCrypto.parseIni(decryptedData);

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

        // 添加分页事件监听器
        document.getElementById('pagination').addEventListener('click', e => {
            e.preventDefault();
            const pageLink = e.target.closest('.page-link');
            if (pageLink && !pageLink.parentElement.classList.contains('disabled')) {
                const newPage = parseInt(pageLink.dataset.page);
                if (newPage && newPage !== this.currentPage) {
                    this.currentPage = newPage;
                    this.renderGames(this.filteredGames);
                    // 滚动到页面顶部
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });

        // 修改搜索事件监听器
        document.getElementById('searchInput').addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredGames = this.games.filter(game =>
                game.name1.toLowerCase().includes(searchTerm) ||
                game.name2.toLowerCase().includes(searchTerm)
            );
            this.currentPage = 1; // 重置到第一页
            this.renderGames(filteredGames);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const platform = new GamePlatform();
    platform.initialize();
});
