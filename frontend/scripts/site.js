const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function setupNavigation() {
  const toggle = $('#siteNavToggle');
  const navigation = $('#siteNav');
  if (!toggle || !navigation) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('is-open', !expanded);
  });

  $$('a', navigation).forEach((link) => link.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }));
}

function setupDialog() {
  const dialog = $('#contactDialog');
  const panel = $('.contact-dialog__panel', dialog);
  const openers = $$('[data-open-contact]');
  const closers = $$('[data-close-contact]', dialog);
  const form = $('#contactForm');
  let opener = null;

  const close = () => {
    dialog.hidden = true;
    document.body.classList.remove('dialog-open');
    opener?.focus();
  };
  const open = (event) => {
    opener = event.currentTarget;
    dialog.hidden = false;
    document.body.classList.add('dialog-open');
    requestAnimationFrame(() => $('#contactName', dialog)?.focus());
  };

  openers.forEach((button) => button.addEventListener('click', open));
  closers.forEach((button) => button.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.hidden) close();
    if (event.key !== 'Tab' || dialog.hidden) return;
    const focusable = $$('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])', panel)
      .filter((item) => !item.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    window.HeimdallUI?.announce('Mensagem pronta para envio. A equipe retornará pelo contato informado.', 'success');
    form.reset();
    close();
  });
}

function setupCarousel() {
  const carousel = $('[data-carousel]');
  if (!carousel) return;
  const viewport = $('.hero-carousel__viewport', carousel);
  const track = $('.hero-carousel__track', carousel);
  const slides = $$('.hero-carousel__slide', carousel);
  const dots = $$('[data-carousel-slide]', carousel);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let timer;
  let dragging = false;
  let startX = 0;
  let startOffset = 0;

  const offsetFor = (index) => -index * viewport.clientWidth;
  const translate = (value, animate = true) => {
    track.style.transition = animate ? 'transform .45s ease' : 'none';
    track.style.transform = `translateX(${value}px)`;
  };

  const show = (index, announce = false) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    translate(offsetFor(current));
    dots.forEach((dot, dotIndex) => dot.setAttribute('aria-selected', String(dotIndex === current)));
    if (announce) window.HeimdallUI?.announce(`Destaque ${current + 1} de ${slides.length}.`);
  };
  const stop = () => window.clearInterval(timer);
  const start = () => {
    stop();
    if (!reducedMotion.matches) timer = window.setInterval(() => show(current + 1), 7000);
  };

  $('[data-carousel-prev]', carousel)?.addEventListener('click', () => { show(current - 1, true); start(); });
  $('[data-carousel-next]', carousel)?.addEventListener('click', () => { show(current + 1, true); start(); });
  dots.forEach((dot) => dot.addEventListener('click', () => { show(Number(dot.dataset.carouselSlide), true); start(); }));
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', (event) => { if (!carousel.contains(event.relatedTarget)) start(); });
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startOffset = offsetFor(current);
    viewport.setPointerCapture?.(event.pointerId);
    viewport.classList.add('is-dragging');
    stop();
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    translate(startOffset + event.clientX - startX, false);
  });
  const endDrag = (event) => {
    if (!dragging) return;
    const moved = event.clientX - startX;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (Math.abs(moved) > Math.min(80, viewport.clientWidth * .15)) current += moved < 0 ? 1 : -1;
    show(current, Math.abs(moved) > 8);
    start();
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('resize', () => show(current));
  reducedMotion.addEventListener('change', start);
  show(0);
  start();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDialog();
  setupCarousel();
});
