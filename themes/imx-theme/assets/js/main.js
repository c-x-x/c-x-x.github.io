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
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // ============================================
  // TOC Active Link - 目录激活
  // ============================================
  const tocLinks = document.querySelectorAll('.toc a');
  const headings = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4');

  if (tocLinks.length > 0 && headings.length > 0) {
    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    headings.forEach(heading => {
      observer.observe(heading);
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
  // Navbar Dock Style - 导航栏 Dock 风格滑动指示器
  // ============================================
  // 使用前面已声明的 navbarMenu

  if (navbarMenu) {
    const menuLinks = navbarMenu.querySelectorAll('a');

    // 设置当前激活页面
    const currentPath = window.location.pathname;
    menuLinks.forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath ||
          (currentPath.startsWith('/posts/') && linkPath === '/posts/') ||
          (currentPath.startsWith('/categories/') && linkPath === '/categories/') ||
          (currentPath.startsWith('/tags/') && linkPath === '/tags/')) {
        link.classList.add('active');
      }
    });

    // 滑动指示器函数
    function updateIndicator(link) {
      const linkRect = link.getBoundingClientRect();
      const menuRect = navbarMenu.getBoundingClientRect();
      const left = linkRect.left - menuRect.left - 5.6; // 0.35rem = 5.6px
      const width = linkRect.width;

      navbarMenu.style.setProperty('--indicator-left', `${left}px`);
      navbarMenu.style.setProperty('--indicator-width', `${width}px`);
    }

    // 添加 CSS 变量支持
    const style = document.createElement('style');
    style.textContent = `
      .navbar-menu::before {
        left: var(--indicator-left, 0.35rem) !important;
        width: var(--indicator-width, 0) !important;
      }
    `;
    document.head.appendChild(style);

    // 初始化激活链接的指示器
    const activeLink = navbarMenu.querySelector('a.active');
    if (activeLink) {
      setTimeout(() => updateIndicator(activeLink), 100);
    }

    // 鼠标悬停效果
    menuLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        updateIndicator(link);
      });
    });

    // 鼠标离开后返回到激活项
    navbarMenu.addEventListener('mouseleave', () => {
      const activeLink = navbarMenu.querySelector('a.active');
      if (activeLink) {
        updateIndicator(activeLink);
      } else {
        navbarMenu.style.setProperty('--indicator-width', '0');
      }
    });

    // 窗口大小改变时重新计算
    window.addEventListener('resize', () => {
      const activeLink = navbarMenu.querySelector('a.active');
      if (activeLink) {
        updateIndicator(activeLink);
      }
    });
  }

})();
