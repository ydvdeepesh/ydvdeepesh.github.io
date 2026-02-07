const tiltCards = document.querySelectorAll('[data-tilt]');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const handleTilt = (event, card) => {
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const rotateX = clamp(((y / rect.height) - 0.5) * -12, -10, 10);
  const rotateY = clamp(((x / rect.width) - 0.5) * 12, -10, 10);
  card.style.setProperty('--rx', `${rotateX}deg`);
  card.style.setProperty('--ry', `${rotateY}deg`);
  card.style.boxShadow = '0 35px 70px rgba(0, 0, 0, 0.45)';
  card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(18px) scale(1.02)`;
};

const resetTilt = (card) => {
  card.style.setProperty('--rx', '0deg');
  card.style.setProperty('--ry', '0deg');
  card.style.boxShadow = '';
  card.style.transform = '';
};

tiltCards.forEach((card) => {
  card.addEventListener('pointermove', (event) => handleTilt(event, card));
  card.addEventListener('pointerleave', () => resetTilt(card));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('section, .hero').forEach((section) => {
  section.classList.add('reveal');
  observer.observe(section);
});

const handleSceneMove = (event) => {
  const x = event.clientX / window.innerWidth;
  const y = event.clientY / window.innerHeight;
  document.documentElement.style.setProperty('--mx', `${x * 100}%`);
  document.documentElement.style.setProperty('--my', `${y * 100}%`);
};

window.addEventListener('pointermove', handleSceneMove);

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  document.querySelector('.orb-1').style.transform = `translate3d(${scrolled * 0.02}px, ${scrolled * 0.04}px, 0)`;
  document.querySelector('.orb-2').style.transform = `translate3d(${scrolled * -0.03}px, ${scrolled * 0.02}px, 0)`;
  document.querySelector('.orb-3').style.transform = `translate3d(-50%, ${scrolled * -0.02}px, 0)`;
});

const dotCanvas = document.getElementById('dot-field');
const dotCtx = dotCanvas ? dotCanvas.getContext('2d') : null;
const dots = [];
let mouse = { x: -9999, y: -9999 };

const resizeDots = () => {
  if (!dotCanvas) return;
  dotCanvas.width = window.innerWidth;
  dotCanvas.height = window.innerHeight;
  dots.length = 0;
  const count = Math.floor((window.innerWidth * window.innerHeight) / 2800);
  for (let i = 0; i < count; i += 1) {
    dots.push({
      x: Math.random() * dotCanvas.width,
      y: Math.random() * dotCanvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      ox: 0,
      oy: 0,
      r: 0.8 + Math.random() * 1.4,
    });
  }
};

const drawDots = () => {
  if (!dotCtx || !dotCanvas) return;
  dotCtx.clearRect(0, 0, dotCanvas.width, dotCanvas.height);
  dotCtx.fillStyle = 'rgba(255,255,255,0.22)';
  const repelRadius = 110;
  dots.forEach((dot) => {
    dot.x += dot.vx;
    dot.y += dot.vy;
    if (dot.x < 0 || dot.x > dotCanvas.width) dot.vx *= -1;
    if (dot.y < 0 || dot.y > dotCanvas.height) dot.vy *= -1;
    const dx = dot.x - mouse.x;
    const dy = dot.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < repelRadius) {
      const force = (repelRadius - dist) / repelRadius;
      dot.ox = (dx / dist) * force * 26;
      dot.oy = (dy / dist) * force * 26;
    } else {
      dot.ox *= 0.9;
      dot.oy *= 0.9;
    }
    dotCtx.beginPath();
    dotCtx.arc(dot.x + dot.ox, dot.y + dot.oy, dot.r, 0, Math.PI * 2);
    dotCtx.fill();
  });
  requestAnimationFrame(drawDots);
};

if (dotCanvas) {
  resizeDots();
  drawDots();
  window.addEventListener('resize', resizeDots);
  window.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  window.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
}

const mobileNav = document.querySelector('.mobile-nav');
const menuToggle = document.querySelector('.menu-toggle');
const menuClose = document.querySelector('.menu-close');

const closeMenu = () => {
  mobileNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  mobileNav.setAttribute('aria-hidden', 'true');
};

menuToggle.addEventListener('click', () => {
  const isOpen = mobileNav.classList.contains('open');
  if (isOpen) {
    closeMenu();
  } else {
    mobileNav.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    mobileNav.setAttribute('aria-hidden', 'false');
  }
});

menuClose.addEventListener('click', closeMenu);

mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

const sectionIds = ['about', 'skills', 'experience', 'projects', 'education', 'contact'];
const navLinks = Array.from(document.querySelectorAll('.nav nav a'));

const setActiveNav = (id) => {
  navLinks.forEach((link) => {
    const target = link.getAttribute('href')?.replace('#', '');
    link.classList.toggle('active', target === id);
  });
};

const updateGuide = () => {
  let activeId = sectionIds[0];
  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.45 && rect.bottom > window.innerHeight * 0.2) {
      activeId = id;
    }
  });
  setActiveNav(activeId);
};

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const target = link.getAttribute('href')?.replace('#', '');
    if (target) setActiveNav(target);
  });
});

window.addEventListener('scroll', updateGuide);
window.addEventListener('resize', updateGuide);
updateGuide();
