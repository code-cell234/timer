/**
 * StudyPulse - 3D Tilt & Spatial Interactive Depth Engine
 * GPU-accelerated 3D parallax tilt, dynamic specular glare sheen, and layered depth.
 */

export class Tilt3DEngine {
  constructor() {
    this.elements = [];
    this.init();
  }

  init() {
    this.refresh();
    
    // Auto re-bind when DOM mutations happen or views switch
    const observer = new MutationObserver(() => {
      this.refresh();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  refresh() {
    const targets = document.querySelectorAll(
      '.focus-card, .deck-card, .leetcode-profile-card, .leetcode-donut-card, .lc-medal-item, .streak-pill, .stat-card, [data-tilt-3d]'
    );

    targets.forEach((el) => {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = 'true';
      this.bindElement(el);
    });
  }

  bindElement(el) {
    // Add 3D container classes
    el.classList.add('card-3d-interactive');

    // Create dynamic specular sheen overlay if not present
    let glare = el.querySelector('.tilt-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'tilt-glare';
      el.appendChild(glare);
    }

    let rafId = null;
    let isHovering = false;

    const maxTilt = parseFloat(el.dataset.tiltMax) || 9; // degrees
    const scale = parseFloat(el.dataset.tiltScale) || 1.02;

    const onMouseMove = (e) => {
      if (!isHovering) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const percentX = (x / rect.width) * 2 - 1; // -1 to 1
      const percentY = (y / rect.height) * 2 - 1; // -1 to 1

      const tiltX = -percentY * maxTilt;
      const tiltY = percentX * maxTilt;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
        
        // Update 3D specular light glare position
        if (glare) {
          const glareX = ((x / rect.width) * 100).toFixed(1);
          const glareY = ((y / rect.height) * 100).toFixed(1);
          glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 70%)`;
          glare.style.opacity = '1';
        }
      });
    };

    const onMouseEnter = () => {
      isHovering = true;
      el.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.25s ease';
    };

    const onMouseLeave = () => {
      isHovering = false;
      if (rafId) cancelAnimationFrame(rafId);
      el.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease';
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      if (glare) {
        glare.style.opacity = '0';
      }
    };

    el.addEventListener('mousemove', onMouseMove, { passive: true });
    el.addEventListener('mouseenter', onMouseEnter, { passive: true });
    el.addEventListener('mouseleave', onMouseLeave, { passive: true });
  }
}

export const tilt3DEngine = new Tilt3DEngine();
