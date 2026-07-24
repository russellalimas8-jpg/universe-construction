// ==========================================================================
// UNIVERSE CONSTRUCTION — main.js
// ==========================================================================

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a link is clicked
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Scroll reveal for elements with .reveal
function revealOnScroll() {
  const revealEls = document.querySelectorAll('.reveal:not(.in-view)');
  if (!revealEls.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => observer.observe(el));
}
revealOnScroll();

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Gallery: load projects from content/projects.json, render cards, then filter (projects.html)
const filterBar = document.getElementById('filterBar');
const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');

if (galleryGrid) {
  fetch(`content/projects.json?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      const projects = data.projects || [];
      galleryGrid.innerHTML = '';

      if (projects.length === 0) {
        galleryGrid.innerHTML = '<p class="gallery-loading">No projects added yet.</p>';
        return;
      }

      projects.forEach((project, pIndex) => {
        const card = document.createElement('article');
        card.className = 'gallery-card reveal';
        card.dataset.category = project.category || 'other';

        const images = Array.isArray(project.images) && project.images.length
          ? project.images.filter(Boolean)
          : (project.image ? [project.image] : []);

        const mainImgId = `gallery-main-${pIndex}`;
        const thumbHTML = images.length
          ? `<div class="gallery-thumb"><img id="${mainImgId}" src="${images[0]}" alt="${project.title}" loading="lazy"></div>`
          : `<div class="gallery-thumb thumb-1"></div>`;

        const thumbStripHTML = images.length > 1
          ? `<div class="gallery-thumb-strip">${images.map((src, i) =>
              `<button type="button" class="gallery-thumb-mini${i === 0 ? ' active' : ''}" data-target="${mainImgId}" data-src="${src}"><img src="${src}" alt="" loading="lazy"></button>`
            ).join('')}</div>`
          : '';

        card.innerHTML = `
          ${thumbHTML}
          ${thumbStripHTML}
          <div class="gallery-info">
            <span class="project-meta meta-dark">${project.meta || ''}</span>
            <h3>${project.title || ''}</h3>
            <p>${project.description || ''}</p>
          </div>
        `;
        galleryGrid.appendChild(card);
      });

      // Wire up thumbnail strips to swap the main image
      galleryGrid.querySelectorAll('.gallery-thumb-mini').forEach(btn => {
        btn.addEventListener('click', () => {
          const mainImg = document.getElementById(btn.dataset.target);
          if (mainImg) mainImg.src = btn.dataset.src;
          btn.closest('.gallery-thumb-strip').querySelectorAll('.gallery-thumb-mini').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      initGalleryFilter();
      revealOnScroll();
    })
    .catch(() => {
      galleryGrid.innerHTML = '<p class="gallery-loading">Could not load projects right now.</p>';
    });
}

function initGalleryFilter() {
  if (!filterBar || !galleryGrid) return;
  const filterBtns = filterBar.querySelectorAll('.filter-btn');
  const cards = galleryGrid.querySelectorAll('.gallery-card');

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    let visibleCount = 0;

    cards.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden-card', !match);
      if (match) visibleCount++;
    });

    if (galleryEmpty) galleryEmpty.hidden = visibleCount !== 0;
  });
}

// Quote form validation (contact.html)
const quoteForm = document.getElementById('quoteForm');

if (quoteForm) {
  const formSuccess = document.getElementById('formSuccess');
  const formError = document.getElementById('formError');

  const validators = {
    fullName: (v) => v.trim().length > 0,
    phone: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    projectType: (v) => v.trim().length > 0,
    details: (v) => v.trim().length > 0,
  };

  function validateField(field) {
    const name = field.name;
    if (!validators[name]) return true;
    const wrapper = field.closest('.form-field');
    const isValid = validators[name](field.value);
    wrapper.classList.toggle('invalid', !isValid);
    return isValid;
  }

  Object.keys(validators).forEach(name => {
    const field = quoteForm.elements[name];
    if (field) {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.closest('.form-field').classList.contains('invalid')) {
          validateField(field);
        }
      });
    }
  });

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let allValid = true;

    Object.keys(validators).forEach(name => {
      const field = quoteForm.elements[name];
      if (field && !validateField(field)) allValid = false;
    });

    if (!allValid) {
      const firstInvalid = quoteForm.querySelector('.form-field.invalid input, .form-field.invalid select, .form-field.invalid textarea');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = quoteForm.querySelector('.form-submit');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (formSuccess) formSuccess.hidden = true;
    if (formError) formError.hidden = true;

    try {
      const formData = new FormData(quoteForm);
      const jsonObject = Object.fromEntries(formData);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(jsonObject)
      });
      const result = await response.json();

      if (response.status === 200 && result.success) {
        if (formSuccess) {
          formSuccess.hidden = false;
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        quoteForm.reset();
      } else {
        console.error('Web3Forms error:', result);
        if (formError) {
          formError.textContent = result.message
            ? `Error: ${result.message}`
            : 'Something went wrong sending your request. Please try again, or contact us directly by phone or email.';
          formError.hidden = false;
        }
      }
    } catch (err) {
      console.error('Network error submitting form:', err);
      if (formError) formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}
