// IMX Theme JavaScript
// 主题切换、侧边栏、搜索、阅读进度条等功能

(function() {
  'use strict';

  // ============================================
  // Theme Toggle - 主题切换
  // ============================================
  const themeToggle = document.querySelector('.theme-toggle');
  const htmlElement = document.documentElement;

  // 获取保存的主题或默认浅色
  function getTheme() {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  }

  // 设置主题
  function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
  }

  // 更新主题图标
  function updateThemeIcon(theme) {
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark'
        ? '<svg width="20" height="20" fill="currentColor"><use href="#icon-sun"></use></svg>'
        : '<svg width="20" height="20" fill="currentColor"><use href="#icon-moon"></use></svg>';
    }
  }

  // 初始化主题
  setTheme(getTheme());

  // 主题切换事件
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  // ============================================
  // Sidebar Toggle - 侧边栏切换
  // ============================================
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (sidebarToggle && sidebar) {
    // 获取侧边栏状态
    const sidebarState = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarState) {
      sidebar.classList.add('collapsed');
    }

    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('active');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', isCollapsed);

      // 更新按钮图标
      sidebarToggle.innerHTML = isCollapsed
        ? '<svg width="24" height="24" fill="currentColor"><use href="#icon-menu"></use></svg>'
        : '<svg width="24" height="24" fill="currentColor"><use href="#icon-close"></use></svg>';
    });
  }

  // ============================================
  // Reading Progress Bar - 阅读进度条
  // ============================================
  const progressBar = document.querySelector('.reading-progress');

  if (progressBar) {
    window.addEventListener('scroll', () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      progressBar.style.width = progress + '%';
    });
  }

  // ============================================
  // Smooth Scroll - 平滑滚动
  // ============================================
  // CSS 中已经有 scroll-behavior: smooth 和 scroll-margin-top
  // 锚点跳转使用浏览器原生行为即可，无需 JavaScript 干预

  // ============================================
  // TOC Active Link - 目录激活
  // ============================================
  const tocLinks = document.querySelectorAll('.toc a');
  const headings = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4, .article-content h5, .article-content h6');

  if (tocLinks.length > 0 && headings.length > 0) {
    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            tocLinks.forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
              }
            });
          }
        }
      });
    }, observerOptions);

    headings.forEach(heading => {
      if (heading.getAttribute('id')) {
        observer.observe(heading);
      }
    });
  }

  // ============================================
  // Search Functionality - 搜索功能
  // ============================================
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  if (searchInput && searchResults) {
    let searchIndex = [];

    // 加载搜索索引
    fetch('/index.json')
      .then(response => response.json())
      .then(data => {
        searchIndex = data;
      })
      .catch(err => console.log('Search index not found'));

    // 搜索函数
    function performSearch(query) {
      if (!query || query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }

      const results = searchIndex.filter(item => {
        const title = item.title.toLowerCase();
        const content = item.content.toLowerCase();
        const searchTerm = query.toLowerCase();
        return title.includes(searchTerm) || content.includes(searchTerm);
      }).slice(0, 10);

      displayResults(results, query);
    }

    // 显示搜索结果
    function displayResults(results, query) {
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">未找到相关内容</div>';
      } else {
        searchResults.innerHTML = results.map(result => `
          <a href="${result.permalink}" class="search-result-item">
            <h3>${highlightText(result.title, query)}</h3>
            <p>${highlightText(result.summary || '', query)}</p>
          </a>
        `).join('');
      }
      searchResults.classList.add('active');
    }

    // 高亮搜索词
    function highlightText(text, query) {
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    }

    // 搜索输入事件
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.classList.remove('active');
      }
    });
  }

  // ============================================
  // Code Copy Button - 代码复制按钮
  // ============================================
  document.querySelectorAll('.highlight').forEach((block, index) => {
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.textContent = '复制';

    button.addEventListener('click', () => {
      const code = block.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        button.textContent = '已复制!';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      });
    });

    block.appendChild(button);
  });

  // ============================================
  // Mobile Menu Toggle - 移动端菜单
  // ============================================
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');

  if (mobileMenuToggle && navbarMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });
  }

  // ============================================
  // Lazy Load Images - 图片懒加载
  // ============================================
  const images = document.querySelectorAll('img[data-src]');

  if ('IntersectionObserver' in window && images.length > 0) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // ============================================
  // Animation on Scroll - 滚动动画
  // ============================================
  const animatedElements = document.querySelectorAll('.post-card, .sidebar-widget');

  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          animationObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    animatedElements.forEach(el => animationObserver.observe(el));
  }

  // ============================================
  // External Links - 外部链接在新标签打开
  // ============================================
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (!link.href.includes(window.location.hostname)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // ============================================
  // Liquid Glass Navbar - iOS 风格液态玻璃导航栏
  // ============================================
  // 使用前面已声明的 navbarMenu

  if (navbarMenu) {
    const menuLinks = navbarMenu.querySelectorAll('a');

    // 设置当前激活页面 - 优化路径匹配逻辑
    function setActiveLink() {
      const currentPath = window.location.pathname;

      // 移除所有 active 类
      menuLinks.forEach(link => link.classList.remove('active'));

      // 规范化路径函数
      function normalizePath(path) {
        // 去除末尾斜杠，空路径返回 '/'
        return path.replace(/\/$/, '') || '/';
      }

      const normalizedCurrentPath = normalizePath(currentPath);

      // 精确匹配当前页面
      let hasActiveLink = false;
      menuLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        const normalizedLinkPath = normalizePath(linkPath);

        // 匹配规则
        if (normalizedLinkPath === normalizedCurrentPath) {
          // 精确匹配
          link.classList.add('active');
          hasActiveLink = true;
        } else if (normalizedLinkPath === '/posts' && normalizedCurrentPath.startsWith('/posts')) {
          // 文章列表页或文章详情页，高亮"文章"菜单
          link.classList.add('active');
          hasActiveLink = true;
        } else if (normalizedLinkPath === '/categories' && normalizedCurrentPath.startsWith('/categories')) {
          // 分类列表页或分类详情页，高亮"分类"菜单
          link.classList.add('active');
          hasActiveLink = true;
        } else if (normalizedLinkPath === '/tags' && normalizedCurrentPath.startsWith('/tags')) {
          // 标签列表页或标签详情页，高亮"标签"菜单
          link.classList.add('active');
          hasActiveLink = true;
        } else if (normalizedLinkPath === '/about' && normalizedCurrentPath.startsWith('/about')) {
          // 关于页面
          link.classList.add('active');
          hasActiveLink = true;
        }
      });

      return hasActiveLink;
    }

    // 液态玻璃滑动指示器函数
    function updateLiquidIndicator(link, instant = false) {
      if (!link) {
        // 没有链接，隐藏滑块
        navbarMenu.style.setProperty('--indicator-width', '0');
        return;
      }

      const linkRect = link.getBoundingClientRect();
      const menuRect = navbarMenu.getBoundingClientRect();

      // 计算位置 - 考虑 padding
      const left = linkRect.left - menuRect.left - 6.4; // 0.4rem = 6.4px
      const width = linkRect.width;

      // 使用 CSS 变量控制位置和宽度
      navbarMenu.style.setProperty('--indicator-left', `${left}px`);
      navbarMenu.style.setProperty('--indicator-width', `${width}px`);

      // 即时切换时禁用过渡动画
      if (instant) {
        navbarMenu.style.setProperty('--indicator-transition', 'none');
        requestAnimationFrame(() => {
          navbarMenu.style.removeProperty('--indicator-transition');
        });
      }
    }

    // 添加 CSS 变量支持
    const style = document.createElement('style');
    style.textContent = `
      .navbar-menu::before {
        left: var(--indicator-left, 0.4rem) !important;
        width: var(--indicator-width, 0) !important;
        transition: var(--indicator-transition, all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94));
      }
    `;
    document.head.appendChild(style);

    // 初始化激活链接的指示器
    setActiveLink();
    const activeLink = navbarMenu.querySelector('a.active');

    // 页面加载时立即设置滑块位置（无动画）
    if (activeLink) {
      // 先立即设置位置，避免从第一个位置滑过来
      updateLiquidIndicator(activeLink, true);

      // 然后延迟显示透明度，营造淡入效果
      setTimeout(() => {
        navbarMenu.style.setProperty('--indicator-opacity', '1');
      }, 100);
    } else {
      // 没有匹配的链接，隐藏滑块
      navbarMenu.style.setProperty('--indicator-width', '0');
    }

    // 添加透明度控制
    const opacityStyle = document.createElement('style');
    opacityStyle.textContent = `
      .navbar-menu::before {
        opacity: var(--indicator-opacity, 0) !important;
      }
    `;
    document.head.appendChild(opacityStyle);

    // 点击菜单项时立即设置 active 并更新滑块
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // 移除所有 active
        menuLinks.forEach(l => l.classList.remove('active'));
        // 添加到点击的链接
        link.classList.add('active');
        // 立即更新滑块位置（带丝滑动画）
        updateLiquidIndicator(link, false);
      });
    });

    // 鼠标悬停效果 - 液态滑动到悬停项
    let hoverTimeout;
    menuLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        updateLiquidIndicator(link, false);
      });
    });

    // 鼠标离开后带动画返回到激活项
    navbarMenu.addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        const activeLink = navbarMenu.querySelector('a.active');
        if (activeLink) {
          updateLiquidIndicator(activeLink, false);
        } else {
          // 如果没有激活项，滑块缩小消失
          navbarMenu.style.setProperty('--indicator-width', '0');
        }
      }, 50); // 轻微延迟，避免抖动
    });

    // 窗口大小改变时重新计算 - 防抖优化
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const activeLink = navbarMenu.querySelector('a.active');
        if (activeLink) {
          updateLiquidIndicator(activeLink, true);
        }
      }, 100);
    });

    // 页面可见性变化时重新计算（解决某些浏览器的布局问题）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          // 重新设置 active 状态
          setActiveLink();
          const activeLink = navbarMenu.querySelector('a.active');
          if (activeLink) {
            updateLiquidIndicator(activeLink, true);
          }
        }, 100);
      }
    });
  }

})();
