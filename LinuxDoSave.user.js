// ==UserScript==
// @name         LINUXDO 帖子标题及源码一键提取器
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  在 linux.do 主贴下方添加复制按钮，点击即同时复制“标题 + Markdown 源码”
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

    // 图标定义 (Material Design Icons)
    // 使用“复制”图标，因为现在是复制所有
    const COPY_ALL_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
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
        // 参考 a.js 的选择器: #topic-title > div > h1 > a.fancy-title > span
        // 为了稳健性，尝试多个选择器
        const selectors = [
            '#topic-title h1 a.fancy-title',
            '.fancy-title',
            'title'
        ];

        for (let s of selectors) {
            const el = document.querySelector(s);
            if (el) {
                // 如果是 title 标签，直接取 text
                if (s === 'title') return el.innerText.replace(' - LINUX DO', '').trim();
                return el.innerText.trim();
            }
        }
        return "";
    }

    // 核心逻辑：获取源码并与标题组合
    function fetchAndCopyAll(btnElement) {
        const topicId = getTopicId();

        if (!topicId) {
            showToast("❌ 无法定位帖子ID", true);
            return;
        }

        // 切换加载状态
        btnElement.innerHTML = LOADING_ICON;
        btnElement.classList.add('loading');

        // 请求 Discourse 原始数据接口
        const apiUrl = `/raw/${topicId}/1`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error("Request failed");
                return response.text();
            })
            .then(text => {
                if (!text) throw new Error("Empty content");

                // 获取标题
                const title = getTitle();
                let finalContent = text;

                // 如果能获取到标题，则拼接: # Title\n\nContent
                if (title) {
                    finalContent = `# ${title}\n\n${text}`;
                }

                GM_setClipboard(finalContent);
                showToast("✅ 标题与源码已复制");
            })
            .catch(err => {
                console.error(err);
                showToast("❌ 获取失败", true);
            })
            .finally(() => {
                // 恢复图标
                btnElement.innerHTML = COPY_ALL_ICON;
                btnElement.classList.remove('loading');
            });
    }

    // 添加按钮
    function addExtractButton() {
        if (!location.href.includes('/t/')) return;

        const postElement = document.querySelector('#post_1');
        if (!postElement) return;

        // 查找操作栏 (Discourse 结构)
        const actionsContainer = postElement.querySelector('nav.post-controls .actions, .topic-body .reply-details');

        // 如果找不到容器或者已经添加过按钮，则跳过
        if (!actionsContainer || postElement.querySelector('.linuxdo-raw-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-default linuxdo-raw-btn';
        btn.innerHTML = COPY_ALL_ICON;
        btn.title = "一键复制标题和 Markdown 源码";

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.classList.contains('loading')) return;
            fetchAndCopyAll(btn);
        });

        // 插入到操作栏末尾
        actionsContainer.appendChild(btn);
    }

    // --- 监听器 ---
    setTimeout(addExtractButton, 800);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                if (document.querySelector('#post_1') && !document.querySelector('#post_1 .linuxdo-raw-btn')) {
                    addExtractButton();
                    break;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
