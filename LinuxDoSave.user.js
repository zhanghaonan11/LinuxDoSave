// ==UserScript==
// @name         Linux.do 下崽器 (新版-修改版-带快捷键)
// @namespace    http://linux.do/
// @version      1.2.1
// @description  备份你珍贵的水贴为Markdown。优化版：性能提升，架构重构，更好的错误处理。
// @author       PastKing (修改：Anonymous)
// @match        https://www.linux.do/t/topic/*
// @match        https://linux.do/t/topic/*
// @license      MIT
// @icon         https://cdn.linux.do/uploads/default/optimized/1X/3a18b4b0da3e8cf96f7eea15241c3d251f28a39b_2_32x32.png
// @grant        none
// @require      https://unpkg.com/turndown@7.1.3/dist/turndown.js
// ==/UserScript==

(function () {
    'use strict';

    // 常量配置
    const CONFIG = {
        BUTTON_ID: 'markdown-download-btn',
        BUTTON_TEXT: 'MD',
        DEBOUNCE_DELAY: 300,
        OBSERVER_TIMEOUT: 5000
    };

    const SELECTORS = {
        SITE_LOGO: '#site-logo',
        TITLE: '#topic-title > div > h1 > a.fancy-title > span',
        CONTENT: '#post_1 > div.row > div.topic-body.clearfix > div.regular.contents > div.cooked'
    };

    const STYLES = {
        BUTTON: `
            padding: 6px 12px;
            font-size: 14px;
            font-weight: bold;
            color: #ffffff;
            background-color: #0f9d58;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            margin-left: 10px;
            vertical-align: middle;
        `,
        BUTTON_HOVER: '#0b8043'
    };

    // 工具函数
    const utils = {
        // 防抖函数
        debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        },

        // 安全的DOM查询
        safeQuerySelector(selector, context = document) {
            try {
                return context.querySelector(selector);
            } catch (error) {
                console.error(`查询选择器失败: ${selector}`, error);
                return null;
            }
        },

        // 清理文件名
        sanitizeFilename(filename) {
            return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
        }
    };

    // 主类：Linux.do下载器
    class LinuxDoDownloader {
        constructor() {
            this.button = null;
            this.observer = null;
            this.isInitialized = false;
            this.debouncedInsertButton = utils.debounce(this.insertButton.bind(this), CONFIG.DEBOUNCE_DELAY);

            this.init();
        }

        init() {
            try {
                this.setupButton();
                this.setupObserver();
                this.bindKeyboardEvents();
                this.isInitialized = true;
                console.log('Linux.do下载器初始化成功');
            } catch (error) {
                console.error('Linux.do下载器初始化失败:', error);
            }
        }

        // 创建下载按钮
        createButton() {
            const button = document.createElement('button');
            button.id = CONFIG.BUTTON_ID;
            button.textContent = CONFIG.BUTTON_TEXT;
            button.style.cssText = STYLES.BUTTON;
            button.title = '下载为Markdown (Ctrl+S)';

            // 悬停效果
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = STYLES.BUTTON_HOVER;
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#0f9d58';
            });

            button.addEventListener('click', this.handleDownload.bind(this));

            return button;
        }

        // 插入按钮
        insertButton() {
            if (document.getElementById(CONFIG.BUTTON_ID)) {
                return; // 按钮已存在
            }

            const siteLogo = utils.safeQuerySelector(SELECTORS.SITE_LOGO);
            if (!siteLogo?.parentNode) {
                return;
            }

            try {
                this.button = this.createButton();
                siteLogo.parentNode.insertBefore(this.button, siteLogo.nextSibling);
            } catch (error) {
                console.error('插入按钮失败:', error);
            }
        }

        // 设置按钮
        setupButton() {
            this.insertButton();
        }

        // 设置DOM观察器
        setupObserver() {
            const siteLogo = utils.safeQuerySelector(SELECTORS.SITE_LOGO);
            if (!siteLogo?.parentNode) {
                // 延迟重试
                setTimeout(() => this.setupObserver(), 1000);
                return;
            }

            const config = {
                childList: true,
                subtree: false // 只监听直接子元素
            };

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        this.debouncedInsertButton();
                        break;
                    }
                }
            });

            this.observer.observe(siteLogo.parentNode, config);

            // 设置观察器超时
            setTimeout(() => {
                if (this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }
            }, CONFIG.OBSERVER_TIMEOUT);
        }

        // 获取文章内容
        getArticleContent() {
            try {
                const titleElement = utils.safeQuerySelector(SELECTORS.TITLE);
                const contentElement = utils.safeQuerySelector(SELECTORS.CONTENT);

                if (!titleElement || !contentElement) {
                    throw new Error('无法找到文章标题或内容元素，页面结构可能已变更');
                }

                const title = titleElement.textContent?.trim();
                const content = contentElement.innerHTML;

                if (!title || !content) {
                    throw new Error('文章标题或内容为空');
                }

                return { title, content };
            } catch (error) {
                console.error('获取文章内容失败:', error);
                throw error;
            }
        }

        // 转换为Markdown
        convertToMarkdown(article) {
            try {
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    codeBlockStyle: 'fenced'
                });

                // 自定义规则处理图片和链接
                turndownService.addRule('images_and_links', {
                    filter: ['a', 'img'],
                    replacement: (content, node) => {
                        if (node.nodeName === 'IMG') {
                            const alt = node.alt || '';
                            const src = node.getAttribute('src') || '';
                            const title = node.title ? ` "${node.title}"` : '';
                            return `![${alt}](${src}${title})`;
                        }

                        if (node.nodeName === 'A') {
                            const href = node.getAttribute('href') || '';
                            const title = node.title ? ` "${node.title}"` : '';
                            const img = node.querySelector('img');

                            if (img) {
                                const alt = img.alt || '';
                                const src = img.getAttribute('src') || '';
                                const imgTitle = img.title ? ` "${img.title}"` : '';
                                return `[![${alt}](${src}${imgTitle})](${href}${title})`;
                            }

                            return `[${node.textContent || ''}](${href}${title})`;
                        }
                    }
                });

                return `# ${article.title}\n\n${turndownService.turndown(article.content)}`;
            } catch (error) {
                console.error('Markdown转换失败:', error);
                throw new Error('Markdown转换失败，请检查内容格式');
            }
        }

        // 下载文件
        downloadFile(content, filename) {
            try {
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');

                a.href = url;
                a.download = utils.sanitizeFilename(filename);
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // 清理URL对象
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (error) {
                console.error('文件下载失败:', error);
                throw new Error('文件下载失败');
            }
        }

        // 处理下载
        handleDownload() {
            try {
                const article = this.getArticleContent();
                const markdown = this.convertToMarkdown(article);
                const filename = `${article.title}.md`;

                this.downloadFile(markdown, filename);
                console.log(`成功下载: ${filename}`);
            } catch (error) {
                const message = `下载失败: ${error.message}`;
                console.error(message);
                alert(message);
            }
        }

        // 绑定键盘事件
        bindKeyboardEvents() {
            document.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.key === 's') {
                    event.preventDefault();
                    this.handleDownload();
                }
            });
        }

        // 清理资源
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            if (this.button) {
                this.button.remove();
                this.button = null;
            }

            this.isInitialized = false;
        }
    }

    // 初始化应用
    let downloader = null;

    function initApp() {
        try {
            if (downloader) {
                downloader.destroy();
            }
            downloader = new LinuxDoDownloader();
        } catch (error) {
            console.error('应用初始化失败:', error);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
        if (downloader) {
            downloader.destroy();
        }
    });

})();