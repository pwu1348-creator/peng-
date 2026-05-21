// script.js — Peng 个人主页交互逻辑

// ========== 元素引用 ==========
const videoIntro = document.getElementById('video-intro');
const introVideo = document.getElementById('introVideo');

const skipVideoBtn = document.getElementById('skipVideo');
const questionsContainer = document.getElementById('questions-container');
const mainContent = document.getElementById('main-content');

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

const videoLoading = document.getElementById('videoLoading');
let videoSkipped = false;

// 移动端播放引导覆盖层
const mobilePlayOverlay = document.getElementById('mobilePlayOverlay');
const mobilePlayBtn = document.getElementById('mobilePlayBtn');

// 设备检测
var isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent);

// 视频加载超时兜底：8 秒后若还没开始播就自动跳过
const VIDEO_TIMEOUT = 8000;
let videoTimeoutId = null;

function startVideoTimeout() {
  videoTimeoutId = setTimeout(() => {
    if (videoSkipped) return;
    if (introVideo && introVideo.currentTime < 0.3 && !introVideo.ended) {
      if (videoLoading) {
        videoLoading.innerHTML = '📱 视频加载较慢，自动跳过中...';
        videoLoading.style.color = '#ffc';
      }
      setTimeout(() => fadeOutVideo(), 800);
    }
  }, VIDEO_TIMEOUT);
}

function clearVideoTimeout() {
  if (videoTimeoutId) {
    clearTimeout(videoTimeoutId);
    videoTimeoutId = null;
  }
}

function tryPlayVideo() {
  if (!introVideo || !introVideo.src || videoSkipped) return;
  var p = introVideo.play();
  if (p && typeof p.catch === 'function') p.catch(function(){});
}

// ========== 移动端：显示播放引导覆盖层 ==========
// 核心逻辑：移动端（尤其安卓微信 X5）必须有用户手势才能播放视频
// 所以在移动端先展示一个播放按钮，用户点击后在同一个事件回调中调用 video.play()
// 这样就满足了浏览器对"用户手势触发"的要求

if (isMobileDevice && mobilePlayOverlay) {
  // 移动端：显示覆盖层，隐藏视频加载提示
  mobilePlayOverlay.style.display = 'block';
  if (videoLoading) videoLoading.style.display = 'none';

  // 点击播放按钮（防止重复触发）
  var mobilePlayTriggered = false;
  function handleMobilePlay() {
    if (mobilePlayTriggered) return;
    mobilePlayTriggered = true;

    // 隐藏覆盖层（带动画）
    mobilePlayOverlay.style.transition = 'opacity 0.5s ease';
    mobilePlayOverlay.style.opacity = '0';
    setTimeout(function() {
      mobilePlayOverlay.style.display = 'none';
    }, 500);

    // 在用户手势回调中直接播放视频 —— 这是解决 X5 限制的关键
    if (introVideo) {
      introVideo.play().then(function() {
        // 播放成功
        clearVideoTimeout();
        if (videoLoading) videoLoading.style.display = 'none';
      }).catch(function() {
        // 播放仍然失败（极端情况），启动超时兜底
        startVideoTimeout();
      });
    }
  }

  mobilePlayBtn.addEventListener('click', handleMobilePlay);
  // 整个覆盖层也可以点击
  mobilePlayOverlay.addEventListener('click', function(e) {
    if (e.target === mobilePlayOverlay || e.target.classList.contains('mobile-play-bg')) {
      handleMobilePlay();
    }
  });

} else {
  // ========== 桌面端：保持原有自动播放逻辑 ==========
  if (mobilePlayOverlay) mobilePlayOverlay.style.display = 'none';

  // 微信 JSBridge 就绪后试一次
  document.addEventListener('WeixinJSBridgeReady', tryPlayVideo, false);
  if (typeof WeixinJSBridge !== 'undefined') tryPlayVideo();

  // 视频加载好后再播放
  if (introVideo) {
    startVideoTimeout();

    introVideo.addEventListener('loadeddata', () => {
      if (videoLoading) videoLoading.style.display = 'none';
      introVideo.play().catch(() => {});
    });

    introVideo.addEventListener('canplay', () => {
      if (videoLoading) videoLoading.style.display = 'none';
      introVideo.play().catch(() => {});
    });

    introVideo.addEventListener('playing', () => {
      clearVideoTimeout();
      if (videoLoading) videoLoading.style.display = 'none';
    });

    introVideo.addEventListener('error', () => {
      clearVideoTimeout();
      if (videoLoading) {
        videoLoading.innerHTML = '⚠️ 视频加载失败，自动跳过中...';
        videoLoading.style.color = '#e88';
      }
      setTimeout(() => fadeOutVideo(), 1000);
    });

    if (introVideo.readyState >= 2) {
      introVideo.play().catch(() => {});
    }
  }
}

// 移动端也需要监听视频事件（播放成功后隐藏 loading、播放结束后跳转等）
if (isMobileDevice && introVideo) {
  introVideo.addEventListener('playing', () => {
    clearVideoTimeout();
    if (videoLoading) videoLoading.style.display = 'none';
  });

  introVideo.addEventListener('error', () => {
    clearVideoTimeout();
    if (videoLoading) {
      videoLoading.innerHTML = '⚠️ 视频加载失败，自动跳过中...';
      videoLoading.style.color = '#e88';
    }
    setTimeout(() => fadeOutVideo(), 1000);
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
  videoSkipped = true;
  clearVideoTimeout();
  cleanupCaptionTiming();
  if (videoLoading) videoLoading.style.display = 'none';
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

// ========== 弹窗控制 ==========
(function() {
  var btnProjects = document.getElementById('btnProjects');
  var btnExperience = document.getElementById('btnExperience');
  var modalProjects = document.getElementById('modalProjects');
  var modalExperience = document.getElementById('modalExperience');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (btnProjects) btnProjects.addEventListener('click', function() { openModal(modalProjects); });
  if (btnExperience) btnExperience.addEventListener('click', function() { openModal(modalExperience); });

  document.querySelectorAll('.modal-close').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = btn.dataset.close;
      closeModal(document.getElementById(targetId));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(function(overlay) {
        closeModal(overlay);
      });
      closeLightbox();
    }
  });
})();

// ========== Gallery Lightbox ==========
var lightbox = document.getElementById('lightbox');
var lightboxImg = document.getElementById('lightboxImg');
var lightboxLabel = document.getElementById('lightboxLabel');

function openLightbox(src, label) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  if (lightboxLabel) lightboxLabel.textContent = label || '';
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(function() { lightboxImg.src = ''; }, 350);
}

document.querySelectorAll('.gallery-card').forEach(function(card) {
  card.addEventListener('click', function() {
    var src = card.dataset.src;
    var label = card.querySelector('span').textContent;
    if (src) openLightbox(src, label);
  });
});

if (lightbox) {
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
      closeLightbox();
    }
  });
}
