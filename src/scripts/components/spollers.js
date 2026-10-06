const SELECTORS = {
  container: '[data-spollers]',
  trigger: '[data-spoller]',
};

const CLASSES = {
  init: 'is-init',
  active: 'is-active',
  sliding: 'is-sliding',
};

let idCounter = 0;

class Spollers {
  constructor() {
    this._mediaListeners = [];
    this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._onMotionChange = () => this._updateSpeed();
    this._updateSpeed();
    this._motionQuery.addEventListener('change', this._onMotionChange);

    this.containers = document.querySelectorAll(SELECTORS.container);
    if (!this.containers.length) return;

    this.init();
  }

  _updateSpeed() {
    if (this._motionQuery.matches) {
      this.speed = 0;
    } else {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--transition-slow').trim();
      const parsed = parseFloat(raw);
      this.speed = isNaN(parsed) ? 500 : parsed * 1000;
    }
  }

  init() {
    this.containers.forEach((container) => {
      const config = container.dataset.spollers;

      if (!config) {
        this.activate(container);
      } else {
        const [breakpoint, type = 'max'] = config.split(',').map((s) => s.trim());
        const mediaQuery = window.matchMedia(`(${type}-width: ${breakpoint}px)`);

        const handleChange = () => {
          if (mediaQuery.matches) {
            this.activate(container);
          } else {
            this.deactivate(container);
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        this._mediaListeners.push({ mediaQuery, handleChange });
        handleChange();
      }
    });
  }

  activate(container) {
    container.classList.add(CLASSES.init);

    const triggers = container.querySelectorAll(SELECTORS.trigger);
    triggers.forEach((trigger) => {
      // Add keyboard support for non-button elements
      if (trigger.tagName !== 'BUTTON') {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
      } else {
        trigger.removeAttribute('tabindex');
      }

      const content = trigger.nextElementSibling;
      if (content) {
        // Generate unique ID for aria-controls
        const id = content.id || `spoller-${++idCounter}`;
        content.id = id;
        trigger.setAttribute('aria-controls', id);
        trigger.setAttribute('aria-expanded', String(trigger.classList.contains(CLASSES.active)));

        if (!trigger.classList.contains(CLASSES.active)) {
          content.hidden = true;
        }
      }
    });

    container.addEventListener('click', this._handleClick);
    container.addEventListener('keydown', this._handleKeydown);
  }

  deactivate(container) {
    container.classList.remove(CLASSES.init);

    const triggers = container.querySelectorAll(SELECTORS.trigger);
    triggers.forEach((trigger) => {
      // Restore native tabindex for buttons, hide non-buttons from tab order
      if (trigger.tagName === 'BUTTON') {
        trigger.removeAttribute('tabindex');
      } else {
        trigger.setAttribute('tabindex', '-1');
      }
      trigger.removeAttribute('aria-expanded');
      trigger.removeAttribute('aria-controls');
      trigger.removeAttribute('role');

      const content = trigger.nextElementSibling;
      if (content) content.hidden = false;
    });

    container.removeEventListener('click', this._handleClick);
    container.removeEventListener('keydown', this._handleKeydown);
  }

  _handleClick = (e) => {
    const trigger = e.target.closest(SELECTORS.trigger);
    if (!trigger) return;

    // Prevent default only for links, not buttons
    if (trigger.tagName === 'A') {
      e.preventDefault();
    }

    this._toggle(trigger);
  };

  _handleKeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const trigger = e.target.closest(SELECTORS.trigger);
    if (!trigger || trigger.tagName === 'BUTTON') return;

    e.preventDefault();
    this._toggle(trigger);
  };

  _toggle(trigger) {
    const container = trigger.closest(SELECTORS.container);
    const isOneSpoller = container.hasAttribute('data-one-spoller');

    // Ignore clicks while the animation is running
    if (container.querySelectorAll(`.${CLASSES.sliding}`).length) return;

    if (isOneSpoller && !trigger.classList.contains(CLASSES.active)) {
      const activeTrigger = container.querySelector(`${SELECTORS.trigger}.${CLASSES.active}`);
      if (activeTrigger) {
        activeTrigger.classList.remove(CLASSES.active);
        activeTrigger.setAttribute('aria-expanded', 'false');
        this._slideUp(activeTrigger.nextElementSibling, this.speed);
      }
    }

    trigger.classList.toggle(CLASSES.active);
    trigger.setAttribute('aria-expanded', String(trigger.classList.contains(CLASSES.active)));
    this._slideToggle(trigger.nextElementSibling, this.speed);
  }

  _slideToggle(target, duration = 500) {
    if (target.hidden) {
      this._slideDown(target, duration);
    } else {
      this._slideUp(target, duration);
    }
  }

  _slideDown(target, duration = 500) {
    if (target.classList.contains(CLASSES.sliding)) return;
    target.classList.add(CLASSES.sliding);

    if (target.hidden) target.hidden = false;

    const height = target.offsetHeight;

    target.style.overflow = 'hidden';
    target.style.height = '0';
    target.style.paddingTop = '0';
    target.style.paddingBottom = '0';
    target.style.marginTop = '0';
    target.style.marginBottom = '0';
    target.offsetHeight; // reflow

    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = `${duration}ms`;
    target.style.height = `${height}px`;
    target.style.removeProperty('padding-top');
    target.style.removeProperty('padding-bottom');
    target.style.removeProperty('margin-top');
    target.style.removeProperty('margin-bottom');

    setTimeout(() => {
      target.style.removeProperty('height');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
      target.classList.remove(CLASSES.sliding);
    }, duration);
  }

  _slideUp(target, duration = 500) {
    if (target.classList.contains(CLASSES.sliding)) return;
    target.classList.add(CLASSES.sliding);

    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = `${duration}ms`;
    target.style.height = `${target.offsetHeight}px`;
    target.offsetHeight; // reflow

    target.style.overflow = 'hidden';
    target.style.height = '0';
    target.style.paddingTop = '0';
    target.style.paddingBottom = '0';
    target.style.marginTop = '0';
    target.style.marginBottom = '0';

    setTimeout(() => {
      target.hidden = true;
      target.style.removeProperty('height');
      target.style.removeProperty('padding-top');
      target.style.removeProperty('padding-bottom');
      target.style.removeProperty('margin-top');
      target.style.removeProperty('margin-bottom');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
      target.classList.remove(CLASSES.sliding);
    }, duration);
  }

  destroy() {
    this.containers.forEach((container) => this.deactivate(container));
    this._mediaListeners.forEach(({ mediaQuery, handleChange }) => {
      mediaQuery.removeEventListener('change', handleChange);
    });
    this._mediaListeners = [];

    // Remove prefers-reduced-motion listener
    this._motionQuery.removeEventListener('change', this._onMotionChange);
  }
}

export { Spollers };
export default new Spollers();
