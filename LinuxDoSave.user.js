// ==UserScript==
// @name         LINUXDO 帖子标题及源码一键提取器 (带下载功能)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  在 linux.do 主贴下方添加复制按钮，支持一键复制“标题 + Markdown 源码”，并支持 Ctrl+S 下载为常用 Markdown 文件
// @author       Gemini & Mozi
// @match        https://linux.do/t/*
// @icon         https://linux.do/uploads/default/original/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994.png
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 样式调整
    GM_addStyle(`
        .linuxdo-raw-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            color: #646464;
            transition: all 0.2s;
            border-radius: 4px;
            margin-right: 5px;
        }
        .linuxdo-raw-btn:hover {
            background-color: var(--d-button-hover-background, #e9e9e9);
            color: var(--primary, #222);
        }
        .linuxdo-raw-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
            pointer-events: none;
        }
        .linuxdo-raw-btn.loading {
            cursor: wait;
            opacity: 0.6;
        }
        /* 提示框样式 */
        #extract-toast {
            position: fixed;
            top: 60px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s, transform 0.3s;
            pointer-events: none;
            font-size: 14px;
            font-weight: 500;
        }
        #extract-toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        #extract-toast.error {
            background: #d73a49;
        }
    `);

    // 图标定义
    const COPY_ALL_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    const DOWNLOAD_ICON = `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
    const LOADING_ICON = `<svg viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><style>@keyframes spin{100%{transform:rotate(360deg)}}</style><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`;

    // 显示提示
    function showToast(message, isError = false) {
        let toast = document.getElementById('extract-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'extract-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = isError ? 'error' : '';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // 清理文件名 (参考 a.js)
    function sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    }

    // 获取 Topic ID
    function getTopicId() {
        const match = window.location.pathname.match(/\/t\/[^\/]+\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }

    // 获取帖子标题
    function getTitle() {
        const selectors = [
            '#topic-title h1 a.fancy-title',
            '.fancy-title',
            'title'
        ];

        for (let s of selectors) {
            const el = document.querySelector(s);
            if (el) {
                if (s === 'title') return el.innerText.replace(' - LINUX DO', '').trim();
                return el.innerText.trim();
            }
        }
        return "Untitled";
    }

    // 核心工具：获取数据 (返回 Promise)
    function fetchTopicData() {
        return new Promise((resolve, reject) => {
            const topicId = getTopicId();
            if (!topicId) {
                reject("无法定位帖子ID");
                return;
            }

            const apiUrl = `/raw/${topicId}/1`;
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) throw new Error("Request failed");
                    return response.text();
                })
                .then(text => {
                    if (!text) throw new Error("Empty content");
                    const title = getTitle();
                    let finalContent = text;
                    if (title && title !== "Untitled") {
                        finalContent = `# ${title}\n\n${text}`;
                    }
                    resolve({ title, content: finalContent });
                })
                .catch(err => {
                    reject(err.message || "获取失败");
                });
        });
    }

    // 动作：下载文件 (参考 a.js)
    function downloadFile(content, filename) {
        try {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = sanitizeFilename(filename);
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('文件下载失败:', error);
            showToast('文件下载失败', true);
        }
    }

    // 动作：执行复制
    function handleCopy(btnElement) {
        if (btnElement) {
            btnElement.innerHTML = LOADING_ICON;
            btnElement.classList.add('loading');
        }

        fetchTopicData()
            .then(({ title, content }) => {
                GM_setClipboard(content);
                showToast("✅ 标题与源码已复制");
            })
            .catch(err => {
                showToast(`❌ ${err}`, true);
            })
            .finally(() => {
                if (btnElement) {
                    btnElement.innerHTML = COPY_ALL_ICON;
                    btnElement.classList.remove('loading');
                }
            });
    }

    // 动作：执行下载
    function handleDownload(btnElement = null) {
        if (btnElement) {
            btnElement.innerHTML = LOADING_ICON;
            btnElement.classList.add('loading');
        } else {
            showToast("⏳ 正在获取内容...", false);
        }

        fetchTopicData()
            .then(({ title, content }) => {
                const filename = `${title}.md`;
                downloadFile(content, filename);
                showToast(`✅ 已下载: ${filename}`);
            })
            .catch(err => {
                showToast(`❌ ${err}`, true);
            })
            .finally(() => {
                if (btnElement) {
                    btnElement.innerHTML = DOWNLOAD_ICON;
                    btnElement.classList.remove('loading');
                }
            });
    }

    // 添加按钮
    function addExtractButtons() {
        if (!location.href.includes('/t/')) return;

        const postElement = document.querySelector('#post_1');
        if (!postElement) return;

        const actionsContainer = postElement.querySelector('nav.post-controls .actions, .topic-body .reply-details');

        if (!actionsContainer || postElement.querySelector('.linuxdo-raw-btn')) return;

        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-default linuxdo-raw-btn';
        copyBtn.innerHTML = COPY_ALL_ICON;
        copyBtn.title = "一键复制标题和 Markdown 源码";
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (copyBtn.classList.contains('loading')) return;
            handleCopy(copyBtn);
        });

        // 下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-default linuxdo-raw-btn';
        downloadBtn.innerHTML = DOWNLOAD_ICON;
        downloadBtn.title = "下载为 Markdown (Ctrl+S)";
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (downloadBtn.classList.contains('loading')) return;
            handleDownload(downloadBtn);
        });

        // 插入到操作栏
        actionsContainer.appendChild(copyBtn);
        actionsContainer.appendChild(downloadBtn);
    }

    // 绑定键盘事件 (Ctrl+S)
    function bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            // 检查 Ctrl+S (Windows/Linux) 或 Command+S (Mac)
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault(); // 阻止浏览器保存网页
                console.log("Triggering Ctrl+S download...");

                // 找到下载按钮以显示加载状态，如果找不到也不影响功能
                const downloadBtn = document.querySelector('#post_1 .linuxdo-raw-btn:nth-child(2)'); // 假设第二个是下载
                // 或者更稳健地查找:
                // const btns = document.querySelectorAll('.linuxdo-raw-btn');
                // const downloadBtn = Array.from(btns).find(b => b.title.includes('Download'));

                handleDownload(downloadBtn);
            }
        });
    }

    // --- 监听器 ---
    setTimeout(addExtractButtons, 800);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                if (document.querySelector('#post_1') && !document.querySelector('#post_1 .linuxdo-raw-btn')) {
                    addExtractButtons();
                    break;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 初始化键盘监听
    bindKeyboardEvents();

})();
