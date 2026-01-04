// ==UserScript==
// @name         LINUXDO主贴内容提取器
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  在 linux.do 主贴下方添加复制按钮，点击一键获取并复制 Markdown 原始源码
// @author       Gemini & Mozi
// @match        https://linux.do/t/*
// @icon         https://linux.do/uploads/default/original/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994.png
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 样式调整：针对纯图标按钮进行优化
    GM_addStyle(`
        .linuxdo-raw-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px; /* 调整内边距，使其接近正方形 */
            color: #646464;
            transition: all 0.2s;
            border-radius: 4px;
        }
        .linuxdo-raw-btn:hover {
            background-color: var(--d-button-hover-background, #e9e9e9);
            color: var(--primary, #222);
        }
        .linuxdo-raw-btn svg {
            width: 18px; /* 稍微调大一点图标 */
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
            top: 60px; /* 稍微往下一点，避免遮挡顶部导航 */
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

    // 图标定义 (Material Design Copy Icon)
    const COPY_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
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

    // 核心逻辑：获取源码并复制
    function fetchAndCopyRaw(btnElement) {
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
                GM_setClipboard(text);
                showToast("✅ 源码已复制");
            })
            .catch(err => {
                console.error(err);
                showToast("❌ 获取失败", true);
            })
            .finally(() => {
                // 恢复图标
                btnElement.innerHTML = COPY_ICON;
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

        if (!actionsContainer || postElement.querySelector('.linuxdo-raw-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-default linuxdo-raw-btn';
        // 仅插入图标，没有 span 文字
        btn.innerHTML = COPY_ICON;
        btn.title = "复制主贴源码 (Markdown)"; // 鼠标悬停显示提示

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.classList.contains('loading')) return;
            fetchAndCopyRaw(btn);
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