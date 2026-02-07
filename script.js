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
};

const resetTilt = (card) => {
  card.style.setProperty('--rx', '0deg');
  card.style.setProperty('--ry', '0deg');
  card.style.boxShadow = '';
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

const updateGuide = () => {
  let nextIndex = 0;
  sectionIds.forEach((id, index) => {
    const section = document.getElementById(id);
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.45 && rect.bottom > window.innerHeight * 0.2) {
      nextIndex = index;
    }
  });

  navLinks.forEach((link, index) => {
    link.classList.toggle('active', index === nextIndex);
  }
};

window.addEventListener('scroll', updateGuide);
window.addEventListener('resize', updateGuide);
updateGuide();
