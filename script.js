// script.js — Mr. Peng 个人主页交互逻辑

// ========== 元素引用 ==========
const videoIntro = document.getElementById('video-intro');
const introVideo = document.getElementById('introVideo');
const skipVideoBtn = document.getElementById('skipVideo');
const questionsContainer = document.getElementById('questions-container');
const mainContent = document.getElementById('main-content');
const heroVisitor = document.getElementById('heroVisitor');
const captions = document.querySelectorAll('.caption');

// 问题页相关
const questionPages = document.querySelectorAll('.question-page');
const qDots = document.querySelectorAll('.q-dot');
const qInputs = document.querySelectorAll('.question-card input');
const qNextBtns = document.querySelectorAll('.q-next-btn');
const goMainBtn = document.getElementById('goMainBtn');

// 问题输入框
const qname = document.getElementById('qname');
const qage = document.getElementById('qage');
const qhobby = document.getElementById('qhobby');
const qmotto = document.getElementById('qmotto');

// ========== 状态 ==========
let currentQIndex = 0;
const totalQuestions = questionPages.length;

// ========== 视频入场 ==========

// 强制播放（部分浏览器拦截 autoplay）
if (introVideo) {
  introVideo.play().catch(() => {
    // 被拦截则静默，用户可点跳过按钮
  });
}

// 视频字幕同步
let captionTimers = [];

function setupCaptionTiming() {
  captions.forEach((caption, i) => {
    const times = (caption.dataset.time || '').split(',').map(Number);
    if (times.length !== 2) return;
    const [showAt, hideAt] = times;

    let shown = false;
    let hidden = false;

    function check(time) {
      if (!shown && time >= showAt) {
        shown = true;
        caption.classList.add('show');
      }
      if (!hidden && time >= hideAt) {
        hidden = true;
        caption.classList.remove('show');
      }
    }

    // 包装成 handler
    const handler = () => {
      if (introVideo.currentTime !== undefined) {
        check(introVideo.currentTime);
      }
    };
    caption._handler = handler;
    introVideo.addEventListener('timeupdate', handler);
  });
}

function cleanupCaptionTiming() {
  captions.forEach(caption => {
    if (caption._handler) {
      introVideo.removeEventListener('timeupdate', caption._handler);
      caption._handler = null;
    }
    caption.classList.remove('show');
  });
}

setupCaptionTiming();

// 视频播完自动跳转
introVideo.addEventListener('ended', () => {
  setTimeout(() => {
    fadeOutVideo();
  }, 800);
});

// 跳过按钮
skipVideoBtn.addEventListener('click', () => {
  fadeOutVideo();
});

function fadeOutVideo() {
  cleanupCaptionTiming();
  videoIntro.style.opacity = '0';
  videoIntro.style.transition = 'opacity 0.6s ease';
  setTimeout(() => {
    introVideo.pause();
    videoIntro.style.display = 'none';
    showQuestions();
  }, 600);
}

function showQuestions() {
  questionsContainer.style.display = 'block';
  showQuestion(0);
  // 自动聚焦第一个输入框
  setTimeout(() => qname.focus(), 500);
}

// ========== 问题页切换 ==========
function showQuestion(index) {
  // 隐藏所有
  questionPages.forEach((page, i) => {
    page.classList.remove('active', 'fade-out');
    if (i !== index) {
      page.style.display = 'none';
    }
  });

  // 显示当前
  const currentPage = questionPages[index];
  currentPage.style.display = 'block';
  // 用 requestAnimationFrame 确保 display 生效后再加 active
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      currentPage.classList.add('active');
    });
  });

  // 更新进度点
  qDots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i < index) dot.classList.add('done');
    if (i === index) dot.classList.add('active');
  });

  currentQIndex = index;

  // 聚焦当前页面的输入框
  const input = currentPage.querySelector('input');
  if (input) {
    setTimeout(() => input.focus(), 400);
  }
}

function goToQuestion(targetId) {
  const targetPage = document.getElementById(targetId);
  const currentPage = questionPages[currentQIndex];

  if (!targetPage || targetPage === currentPage) return;

  // 当前页淡出
  currentPage.classList.add('fade-out');

  setTimeout(() => {
    currentPage.classList.remove('active', 'fade-out');
    currentPage.style.display = 'none';

    const targetIndex = Array.from(questionPages).findIndex(p => p.id === targetId);
    if (targetIndex >= 0) {
      showQuestion(targetIndex);
    }
  }, 400);
}

// ========== 下一题按钮 ==========
qNextBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const nextId = btn.dataset.next;
    const currentInput = questionPages[currentQIndex].querySelector('input');

    // 简单校验：至少填点东西
    if (currentInput && !currentInput.value.trim()) {
      currentInput.style.borderColor = '#e88';
      currentInput.style.boxShadow = '0 0 0 8px rgba(238,136,136,0.1)';
      currentInput.focus();
      setTimeout(() => {
        currentInput.style.borderColor = '';
        currentInput.style.boxShadow = '';
      }, 1500);
      return;
    }

    if (nextId) {
      goToQuestion(nextId);
    }
  });
});

// ========== 进入主页按钮 ==========
goMainBtn.addEventListener('click', () => {
  const mottoInput = qmotto;
  if (!mottoInput.value.trim()) {
    mottoInput.style.borderColor = '#e88';
    mottoInput.focus();
    setTimeout(() => {
      mottoInput.style.borderColor = '';
    }, 1500);
    return;
  }
  enterMainPage();
});

// ========== 键盘交互：回车跳转 ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    // 检查是否在问题页中
    const activeQ = document.querySelector('.question-page.active');
    if (activeQ) {
      e.preventDefault();
      const input = activeQ.querySelector('input');
      if (input && !input.value.trim()) {
        input.style.borderColor = '#e88';
        input.focus();
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
        return;
      }

      if (currentQIndex < totalQuestions - 1) {
        // 还有下一题
        const nextBtn = activeQ.querySelector('.q-next-btn');
        if (nextBtn && nextBtn.dataset.next) {
          goToQuestion(nextBtn.dataset.next);
        }
      } else {
        // 最后一题，进入主页
        enterMainPage();
      }
    }
  }
});

// ========== 进度点点击 ==========
qDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const targetId = dot.dataset.target;
    const targetIndex = Array.from(questionPages).findIndex(p => p.id === targetId);
    // 只允许回到已经回答过的题目
    if (targetIndex >= 0 && targetIndex < currentQIndex) {
      goToQuestion(targetId);
    }
  });
});

// ========== 进入主页面 ==========
function enterMainPage() {
  // 收集用户数据
  const visitorData = {
    name: qname.value.trim() || '神秘人',
    age: qage.value.trim() || '未知',
    hobby: qhobby.value.trim() || '保密',
    motto: qmotto.value.trim() || '沉默是金'
  };

  // 在 Hero 区域显示访客信息
  heroVisitor.innerHTML = `
    ${visitorData.name} · ${visitorData.age}岁 · 爱好${visitorData.hobby} · 「${visitorData.motto}」
  `;

  // 问题页淡出
  const activeQ = questionPages[currentQIndex];
  activeQ.classList.add('fade-out');
  questionsContainer.style.transition = 'opacity 0.6s ease';
  questionsContainer.style.opacity = '0';

  setTimeout(() => {
    questionsContainer.style.display = 'none';
    mainContent.style.display = 'block';

    // 滚动到顶部
    window.scrollTo(0, 0);

    // 延迟触发入场动画
    requestAnimationFrame(() => {
      mainContent.style.opacity = '1';
    });
  }, 600);
}

// ========== 主导航滚动高亮 ==========
const navLinks = document.querySelectorAll('.nav-links a');
const panels = document.querySelectorAll('.panel, .hero');
const mainNav = document.getElementById('mainNav');

function updateActiveNav() {
  let currentSection = '';

  panels.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 120) {
      currentSection = section.id;
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active-link');
    if (link.getAttribute('href') === '#' + currentSection) {
      link.classList.add('active-link');
    }
  });

  // Nav 阴影
  if (window.scrollY > 20) {
    mainNav.classList.add('scrolled');
  } else {
    mainNav.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// ========== 主页面初始状态 ==========
mainContent.style.opacity = '0';
mainContent.style.transition = 'opacity 0.8s ease';

// ========== 入场动画：面板滚动淡入 ==========
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
};

const panelObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      panelObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// 初始化面板动画
panels.forEach(panel => {
  if (panel.classList.contains('panel')) {
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(30px)';
    panel.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    panelObserver.observe(panel);
  }
});
