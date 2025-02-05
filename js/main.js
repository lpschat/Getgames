class GamePlatform {
    constructor() {
        this.games = [];
        this.modal = new bootstrap.Modal(document.getElementById('gameModal'));
        this.initializeEventListeners();
        this.currentPage = 1;
        this.gamesPerPage = 16; // 每页显示12个游戏
        this.filteredGames = []; // 用于存储搜索过滤后的游戏
        this.imageCache = new Map(); // 添加图片缓存
        this.initializeLazyLoading();

        // 添加模态框关闭事件监听
        document.getElementById('gameModal').addEventListener('hidden.bs.modal', () => {
            // 找到模态框中的所有视频元素并停止播放
            const videos = document.querySelectorAll('#gameModal video');
            videos.forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
        });
    }

    initializeLazyLoading() {
        // 使用 Intersection Observer 实现图片懒加载
        this.imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadGameImage(img.dataset.bh);
                    observer.unobserve(img);
                }
            });
        }, {
            root: null,
            rootMargin: '50px', // 提前50px开始加载
            threshold: 0.1
        });
    }

    async initialize() {
        try {
            await this.loadGames();
            // 确保 this.games 是一个数组
            if (Array.isArray(this.games)) {
                this.renderGames(this.games);
            } else {
                console.error('游戏数据格式错误:', this.games);
                this.showError('数据加载失败');
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('初始化失败，请刷新页面重试');
        }
    }

    async loadGames() {
        this.showLoading();
        try {
            // 检查本地缓存
            const cachedData = localStorage.getItem('gamesCache');
            if (cachedData) {
                const { timestamp, data } = JSON.parse(cachedData);
                // 缓存时间小于12小时则使用缓存
                if (Date.now() - timestamp < 43200000) {
                    this.games = data;
                    return;
                }
            }

            const proxyUrl = 'https://works.lpdd.eu.org/games';
            const response = await fetch(proxyUrl, {
                headers: {
                    'Cache-Control': 'max-age=3600',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 确保 data.Content 是数组
            if (!Array.isArray(data.Content)) {
                throw new Error('Invalid data format: Content is not an array');
            }

            // 修改解密逻辑，添加 mageA 字段
            this.games = await Promise.all(data.Content.map(async item => {
                try {
                    return {
                        name1: await GameCrypto.decrypt(item.Name1),
                        name2: await GameCrypto.decrypt(item.Name2),
                        bh: await GameCrypto.decrypt(item.BH),
                        mm: await GameCrypto.decrypt(item.MM),
                        xingj: await GameCrypto.decrypt(item.XingJ),
                        riq: await GameCrypto.decrypt(item.RiQ),
                        mageA: await GameCrypto.decrypt(item.MageA) // 添加封面图片
                    };
                } catch (decryptError) {
                    console.error('游戏数据解密失败:', decryptError);
                    return {
                        name1: item.Name1,
                        name2: item.Name2,
                        bh: item.BH,
                        mm: item.MM,
                        xingj: item.XingJ,
                        riq: item.RiQ,
                        mageA: item.MageA
                    };
                }
            }));

            // 确保解密后的数据是数组
            if (!Array.isArray(this.games)) {
                throw new Error('Failed to process game data');
            }

            // 对整个游戏列表进行排序
            this.games.sort((a, b) => {
                const dateA = new Date(a.riq.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime();
                const dateB = new Date(b.riq.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime();
                return dateB - dateA;
            });

            // 更新本地缓存
            localStorage.setItem('gamesCache', JSON.stringify({
                timestamp: Date.now(),
                data: this.games
            }));
        } catch (error) {
            console.error('加载游戏数据失败:', error);
            // 如果有缓存数据，在请求失败时使用缓存
            const cachedData = localStorage.getItem('gamesCache');
            if (cachedData) {
                const { data } = JSON.parse(cachedData);
                this.games = data;
                this.showError('使用缓存数据显示');
            } else {
                this.showError('加载失败，请稍后重试');
                this.games = [];
            }
        } finally {
            this.hideLoading();
        }
    }

    renderGames(games) {
        this.filteredGames = games;
        const startIndex = (this.currentPage - 1) * this.gamesPerPage;
        const endIndex = startIndex + this.gamesPerPage;
        const gamesToShow = games.slice(startIndex, endIndex);

        // 添加调试日志
        console.log('Games per page:', this.gamesPerPage);
        console.log('Games to show:', gamesToShow.length);
        console.log('Start index:', startIndex);
        console.log('End index:', endIndex);

        const container = document.getElementById('gameGrid');
        container.innerHTML = gamesToShow.map(game => this.createGameCard(game)).join('');

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
        const imageUrl = game.mageA && game.mageA !== 'WLCW' ? game.mageA : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'16\'%3E暂无图片%3C/text%3E%3C/svg%3E';

        return `
            <div class="col-md-3 col-sm-6">
                <div class="game-card" data-bh="${game.bh}">
                    <div class="game-image-container">
                        <div class="image-placeholder"></div>
                        <img src="${imageUrl}" 
                             class="game-image" 
                             alt="${game.name1}"
                             loading="lazy"
                             onload="this.classList.add('loaded')"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'16\'%3E暂无图片%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div class="game-title">${game.name1}</div>
                    <div class="game-info">
                        <div class="rating">${this.getStarRating(parseFloat(game.xingj))}</div>
                        <div class="update-date">${game.riq}</div>
                    </div>
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
            // 保存当前游戏信息
            this.currentGame = this.games.find(game => game.bh === bh);

            // 先显示基本信息和加载动画
            this.showModalLoading();
            this.modal.show();

            const iniUrl = `https://works.lpdd.eu.org/game/${bh}`;
            const response = await fetch(iniUrl);
            const encryptedData = await response.arrayBuffer();

            // 解密INI数据
            const decryptedData = GameCrypto.decryptIni(new Uint8Array(encryptedData));
            const gameInfo = GameCrypto.parseIni(decryptedData);

            // 更新模态框内容
            this.updateModalContent(gameInfo);
        } catch (error) {
            console.error('加载游戏详情失败:', error);
            this.showModalError();
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

    updateModalContent(gameInfo) {
        const modalBody = document.querySelector('#gameModal .modal-body');
        const newContent = document.createElement('div');
        newContent.className = 'game-detail-container fade-in';

        // 构建下载链接
        const downloads = [];
        for (let i = 1; i <= 3; i++) {
            const name = gameInfo.xiazai[`xiazai${i}_ming`];
            const url = gameInfo.xiazai[`xiazai${i}_dizhi`];
            const pwd = gameInfo.xiazai[`xiazai${i}_fwm`];

            if (name && name !== 'WLCW' && url && url !== 'WLCW') {
                downloads.push({
                    name,
                    url,
                    pwd: pwd !== 'WLCW' ? pwd : null
                });
            }
        }

        // 构建新内容
        newContent.innerHTML = `
            <div class="game-media-section">
                ${gameInfo.C1?.sc1 && gameInfo.C1.sc1 !== 'WLCW' ? `
                    <div class="game-video-container mb-3">
                        <video controls class="w-100">
                            <source src="${gameInfo.C1.sc1}" type="video/mp4">
                            您的浏览器不支持视频播放。
                        </video>
                    </div>
                ` : ''}
                <div class="game-screenshots">
                    <div id="screenshotCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
                            ${Object.entries(gameInfo.C1 || {})
                .filter(([key, value]) => key.startsWith('sc') && value !== 'WLCW' && key !== 'sc1')
                .map(([_, url], index) => `
                                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                        <img src="${url}" class="d-block w-100" alt="游戏截图">
                                    </div>
                                `).join('')}
                        </div>
                        ${Object.entries(gameInfo.C1 || {})
                .filter(([key, value]) => key.startsWith('sc') && value !== 'WLCW' && key !== 'sc1')
                .length > 1 ? `
                            <button class="carousel-control-prev" type="button" data-bs-target="#screenshotCarousel" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">上一张</span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#screenshotCarousel" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">下一张</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="game-detail-info mt-3">
                <h5>游戏描述</h5>
                <p>${gameInfo.zhu?.yxbb || '暂无描述'}</p>
                <div class="download-section mt-3">
                    <h5>下载链接</h5>
                    ${downloads.length > 0 ? `
                        <div class="list-group">
                            ${downloads.map(dl => `
                                <a href="${dl.url}" target="_blank" class="list-group-item list-group-item-action">
                                    ${dl.name}
                                    ${dl.pwd ? `<span class="badge bg-secondary float-end">提取码: ${dl.pwd}</span>` : ''}
                                </a>
                            `).join('')}
                        </div>
                        ${this.currentGame?.mm && this.currentGame.mm !== 'WLCW' ? `
                            <div class="alert alert-info mt-3">
                                <i class="fas fa-key"></i> 解压密码：${this.currentGame.mm}
                            </div>
                        ` : ''}
                    ` : '<p>暂无下载链接</p>'}
                </div>
                <div class="mt-3">
                    <small class="text-muted">更新时间: ${gameInfo.time?.sj || '未知日期'}</small>
                </div>
            </div>
        `;

        // 使用淡入效果替换内容
        modalBody.innerHTML = '';
        modalBody.appendChild(newContent);

        // 初始化新的轮播图
        if (Object.entries(gameInfo.C1 || {}).filter(([key, value]) => key.startsWith('sc') && value !== 'WLCW' && key !== 'sc1').length > 0) {
            new bootstrap.Carousel(document.getElementById('screenshotCarousel'));
        }
    }

    // 添加加载状态管理
    showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.remove();
        }
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification error';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        // 自动消失
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 添加显示模态框加载状态的方法
    showModalLoading() {
        const modalTitle = document.querySelector('#gameModal .modal-title');
        const modalBody = document.querySelector('#gameModal .modal-body');

        // 如果有当前游戏信息，显示游戏名称
        modalTitle.textContent = this.currentGame ? this.currentGame.name1 : '加载中...';

        // 显示加载动画和基本信息
        modalBody.innerHTML = `
            <div class="game-detail-loading">
                <div class="game-basic-info mb-4">
                    ${this.currentGame ? `
                        <div class="game-title-section mb-3">
                            <h4>${this.currentGame.name1}</h4>
                            <div class="game-meta">
                                <span class="rating">${this.getStarRating(parseFloat(this.currentGame.xingj))}</span>
                                <span class="update-date">更新时间: ${this.currentGame.riq}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="loading-animation">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <div class="loading-text mt-2">正在加载游戏详情...</div>
                </div>
            </div>
        `;
    }

    // 添加显示模态框错误状态的方法
    showModalError() {
        const modalBody = document.querySelector('#gameModal .modal-body');
        modalBody.innerHTML = `
            <div class="game-detail-error text-center">
                <div class="error-icon mb-3">
                    <i class="fas fa-exclamation-circle text-danger fa-3x"></i>
                </div>
                <h5 class="text-danger">加载失败</h5>
                <p class="text-muted">抱歉，游戏详情加载失败，请稍后重试</p>
                <button type="button" class="btn btn-primary mt-3" data-bs-dismiss="modal">关闭</button>
            </div>
        `;
    }
}

// 设置正确的密码
const CORRECT_PASSWORD = "821024"; // 你可以修改这个密码

// 创建一个新的初始化函数来控制游戏平台的加载
function initializeAfterPassword() {
    const platform = new GamePlatform();
    platform.initialize();
}

function checkPassword() {
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');
    const passwordScreen = document.getElementById('password-screen');
    const mainContent = document.getElementById('main-content');

    if (passwordInput.value === CORRECT_PASSWORD) {
        // 密码正确，隐藏密码界面，显示主内容
        passwordScreen.style.display = 'none';
        mainContent.style.display = 'block';
        // 只在密码正确时初始化游戏平台
        initializeAfterPassword();
    } else {
        // 密码错误，显示错误信息
        errorMessage.textContent = '密码错误，请重试';
        passwordInput.value = '';
    }
}

// 页面加载时只设置密码验证相关的监听
document.addEventListener('DOMContentLoaded', function () {
    const mainContent = document.getElementById('main-content');
    mainContent.style.display = 'none';

    // 添加回车键监听
    document.getElementById('password-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
});
