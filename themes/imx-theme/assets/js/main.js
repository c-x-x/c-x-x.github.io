// IMX Theme JavaScript
// 主题切换、侧边栏、搜索、阅读进度条等功能

(function() {
  'use strict';

  // ============================================
  // Theme Toggle - 主题切换
  // ============================================
  const themeToggle = document.querySelector('.theme-toggle');
  const htmlElement = document.documentElement;
  const mobileQuery = window.matchMedia('(max-width: 768px)');

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
    function updateSidebarIcon(isOpen) {
      sidebarToggle.innerHTML = isOpen
        ? '<svg width="24" height="24" fill="currentColor"><use href="#icon-close"></use></svg>'
        : '<svg width="24" height="24" fill="currentColor"><use href="#icon-menu"></use></svg>';
    }

    function syncSidebarMode() {
      if (mobileQuery.matches) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
        updateSidebarIcon(false);
        return;
      }

      sidebar.classList.remove('active');
      sidebarToggle.classList.remove('active');
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      sidebar.classList.toggle('collapsed', isCollapsed);
      updateSidebarIcon(!isCollapsed);
    }

    syncSidebarMode();

    sidebarToggle.addEventListener('click', () => {
      if (mobileQuery.matches) {
        const isOpen = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isOpen);
        sidebarToggle.classList.toggle('active', isOpen);
        updateSidebarIcon(isOpen);
        return;
      }

      sidebarToggle.classList.remove('active');
      const isCollapsed = sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', !isCollapsed);
      localStorage.setItem('sidebarCollapsed', !isCollapsed);
      updateSidebarIcon(isCollapsed);
    });

    mobileQuery.addEventListener('change', () => {
      syncSidebarMode();
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
    // 添加复制按钮
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

    // 添加语言标签（右下角）
    const codeElement = block.querySelector('code[data-lang]');
    if (codeElement) {
      const lang = codeElement.getAttribute('data-lang') || 'bash';
      const langLabel = document.createElement('span');
      langLabel.className = 'code-lang-label';
      langLabel.textContent = lang;
      block.appendChild(langLabel);
    } else {
      // 没有 data-lang，默认显示 bash
      const langLabel = document.createElement('span');
      langLabel.className = 'code-lang-label';
      langLabel.textContent = 'bash';
      block.appendChild(langLabel);
    }
  });

  // ============================================
  // Mobile Menu Toggle - 移动端菜单
  // ============================================
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');

  if (mobileMenuToggle && navbarMenu) {
    mobileMenuToggle.setAttribute('aria-expanded', 'false');

    function setMobileMenu(open) {
      navbarMenu.classList.toggle('active', open);
      mobileMenuToggle.classList.toggle('active', open);
      mobileMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('mobile-menu-open', open);
    }

    mobileMenuToggle.addEventListener('click', () => {
      setMobileMenu(!navbarMenu.classList.contains('active'));
    });

    navbarMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (mobileQuery.matches) {
          setMobileMenu(false);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (
        mobileQuery.matches &&
        navbarMenu.classList.contains('active') &&
        !e.target.closest('.navbar-container')
      ) {
        setMobileMenu(false);
      }
    });

    window.addEventListener('resize', () => {
      if (!mobileQuery.matches) {
        setMobileMenu(false);
      }
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
    const menuLinks = Array.from(navbarMenu.querySelectorAll('a'));
    let menuRect = null;
    let itemMetrics = [];
    let pointerX = null;
    let pointerFrame = null;
    let isPointerTracking = false;
    let resizeTimeout = null;

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

    function isDesktopNavbar() {
      return !mobileQuery.matches;
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function refreshNavbarMetrics() {
      menuRect = navbarMenu.getBoundingClientRect();
      itemMetrics = menuLinks
        .map(link => {
          const item = link.parentElement;
          if (!item) return null;
          const itemRect = item.getBoundingClientRect();
          const left = itemRect.left - menuRect.left;
          const width = itemRect.width;

          return {
            link,
            left,
            width,
            center: left + width / 2
          };
        })
        .filter(Boolean);
    }

    function setIndicatorTransition(instant) {
      if (instant) {
        navbarMenu.style.setProperty('--indicator-transition', 'none');
      } else {
        navbarMenu.style.removeProperty('--indicator-transition');
      }
    }

    function setIndicatorPosition(left, width, options = {}) {
      if (!Number.isFinite(left) || !Number.isFinite(width)) return;

      setIndicatorTransition(Boolean(options.instant));
      navbarMenu.style.setProperty('--indicator-x', `${left.toFixed(3)}px`);
      navbarMenu.style.setProperty('--indicator-width', `${width.toFixed(3)}px`);
      navbarMenu.style.setProperty('--indicator-opacity', '1');
    }

    function hideIndicator(instant = false) {
      setIndicatorTransition(instant);
      navbarMenu.style.setProperty('--indicator-width', '0px');
      navbarMenu.style.setProperty('--indicator-opacity', '0');
    }

    function metricForLink(link) {
      return itemMetrics.find(metric => metric.link === link);
    }

    function updateLiquidIndicator(link, instant = false) {
      if (!isDesktopNavbar()) return;

      refreshNavbarMetrics();

      const metric = metricForLink(link);
      if (!metric) {
        hideIndicator(instant);
        return;
      }

      setIndicatorPosition(metric.left, metric.width, { instant });

      if (instant) {
        requestAnimationFrame(() => {
          if (!isPointerTracking) {
            navbarMenu.style.removeProperty('--indicator-transition');
          }
        });
      }
    }

    // 根据鼠标位置更新滑块：中心点跟随指针，宽度在相邻菜单项之间平滑插值。
    function updateIndicatorByPointer(clientX) {
      if (!isDesktopNavbar()) return;

      if (!menuRect || itemMetrics.length !== menuLinks.length) {
        refreshNavbarMetrics();
      }

      if (!menuRect || itemMetrics.length === 0) return;

      const localX = clamp(clientX - menuRect.left, 0, menuRect.width);
      let leftMetric = itemMetrics[0];
      let rightMetric = itemMetrics[itemMetrics.length - 1];

      for (let index = 0; index < itemMetrics.length - 1; index += 1) {
        const current = itemMetrics[index];
        const next = itemMetrics[index + 1];

        if (localX >= current.center && localX <= next.center) {
          leftMetric = current;
          rightMetric = next;
          break;
        }

        if (localX < itemMetrics[0].center) {
          rightMetric = itemMetrics[0];
          break;
        }

        if (localX > itemMetrics[itemMetrics.length - 1].center) {
          leftMetric = itemMetrics[itemMetrics.length - 1];
          break;
        }
      }

      const distance = rightMetric.center - leftMetric.center;
      const ratio = distance === 0
        ? 0
        : clamp((localX - leftMetric.center) / distance, 0, 1);
      const width = leftMetric.width + (rightMetric.width - leftMetric.width) * ratio;
      const maxLeft = menuRect.width - width;
      const left = clamp(localX - width / 2, 0, Math.max(0, maxLeft));

      setIndicatorPosition(left, width, { instant: true });
    }

    function schedulePointerUpdate(clientX) {
      pointerX = clientX;

      if (pointerFrame !== null) return;

      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = null;

        if (isPointerTracking && pointerX !== null) {
          updateIndicatorByPointer(pointerX);
        }
      });
    }

    function restoreActiveIndicator() {
      const activeLink = navbarMenu.querySelector('a.active');

      if (activeLink) {
        updateLiquidIndicator(activeLink, false);
      } else {
        hideIndicator(false);
      }
    }

    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        // 移除所有 active
        menuLinks.forEach(l => l.classList.remove('active'));
        // 添加到点击的链接
        link.classList.add('active');

        if (isDesktopNavbar()) {
          updateLiquidIndicator(link, false);
        }
      });
    });

    navbarMenu.addEventListener('pointerenter', (event) => {
      if (!isDesktopNavbar() || event.pointerType === 'touch') return;

      isPointerTracking = true;
      refreshNavbarMetrics();
      navbarMenu.style.setProperty('--indicator-transition', 'none');
      schedulePointerUpdate(event.clientX);
    });

    navbarMenu.addEventListener('pointermove', (event) => {
      if (!isPointerTracking || event.pointerType === 'touch') return;

      schedulePointerUpdate(event.clientX);
    });

    function stopPointerTracking() {
      isPointerTracking = false;
      pointerX = null;

      if (pointerFrame !== null) {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = null;
      }

      navbarMenu.style.removeProperty('--indicator-transition');
      restoreActiveIndicator();
    }

    navbarMenu.addEventListener('pointerleave', stopPointerTracking);
    navbarMenu.addEventListener('pointercancel', stopPointerTracking);

    function initializeIndicator() {
      setActiveLink();

      if (!isDesktopNavbar()) {
        hideIndicator(true);
        return;
      }

      const activeLink = navbarMenu.querySelector('a.active');

      if (activeLink) {
        updateLiquidIndicator(activeLink, true);
      } else {
        hideIndicator(true);
      }
    }

    initializeIndicator();

    // 窗口大小改变时重新计算 - 防抖优化
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        refreshNavbarMetrics();
        initializeIndicator();
      }, 100);
    });

    if ('ResizeObserver' in window) {
      const navbarResizeObserver = new ResizeObserver(() => {
        if (isPointerTracking) {
          refreshNavbarMetrics();
        } else {
          initializeIndicator();
        }
      });

      navbarResizeObserver.observe(navbarMenu);
      menuLinks.forEach(link => {
        if (link.parentElement) {
          navbarResizeObserver.observe(link.parentElement);
        }
      });
    }

    // 页面可见性变化时重新计算（解决某些浏览器的布局问题）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          // 重新设置 active 状态
          initializeIndicator();
        }, 100);
      }
    });
  }

})();
