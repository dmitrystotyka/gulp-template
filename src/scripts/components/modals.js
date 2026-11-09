(() => {
  'use strict';

  const App = (window.App = window.App || {});
  const { bodyLock, bodyUnLock } = App;

  const SELECTORS = {
    wrapper: '#modal-wrapper',
    popup: '.popup',
    body: '.popup__body',
    trigger: '[data-popup]',
    close: '[data-popup-close]',
  };

  const CLASSES = {
    active: 'is-active',
  };

  const FOCUSABLE_SELECTORS =
    'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [contenteditable], details > summary, [tabindex]:not([tabindex="-1"])';

  /**
   * Get transition duration from CSS custom property or computed style
   * @param {HTMLElement} element - Element to get transition from
   * @param {string} cssVar - CSS variable name (e.g., '--popup-speed')
   * @returns {number} Duration in milliseconds (0 if not defined in CSS)
   */
  const getTransitionDuration = (element, cssVar = '--popup-speed') => {
    if (!element) return 0;

    const styles = getComputedStyle(element);

    // First try to get from CSS variable
    const cssVarValue = styles.getPropertyValue(cssVar).trim();
    if (cssVarValue) {
      const parsed = parseFloat(cssVarValue);
      // Check for explicit 'ms' unit — keep as-is; otherwise treat as seconds
      if (cssVarValue.endsWith('ms')) {
        return parsed;
      }
      return parsed * 1000;
    }

    // Fallback to computed transition-duration
    const transitionDuration = styles.transitionDuration;
    if (transitionDuration && transitionDuration !== '0s') {
      const parsed = parseFloat(transitionDuration);
      return parsed * 1000;
    }

    // Return 0 if no CSS transition defined
    return 0;
  };

  class Modal {
    constructor() {
      this.wrapper = document.querySelector(SELECTORS.wrapper);
      if (!this.wrapper) return;

      // Speed from CSS variable --popup-speed (respect reduced-motion)
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.speed = prefersReducedMotion ? 0 : getTransitionDuration(this.wrapper);
      this.isLocked = false;
      this._lastTrigger = null;

      this._boundHandleClick = this.handleClick.bind(this);
      this._boundHandleKeydown = this.handleKeydown.bind(this);

      this.init();
    }

    init() {
      document.addEventListener('click', this._boundHandleClick);
      document.addEventListener('keydown', this._boundHandleKeydown);
    }

    destroy() {
      document.removeEventListener('click', this._boundHandleClick);
      document.removeEventListener('keydown', this._boundHandleKeydown);

      // Close all active popups
      const activePopups = document.querySelectorAll(`${SELECTORS.popup}.${CLASSES.active}`);
      if (activePopups.length) {
        activePopups.forEach((popup) => {
          popup.classList.remove(CLASSES.active);
          popup.removeAttribute('aria-modal');
          popup.removeAttribute('aria-labelledby');
          popup.removeAttribute('role');
          popup.removeAttribute('tabindex');
        });
        bodyUnLock(0);
      }
      this._lastTrigger = null;
    }

    handleClick(e) {
      const trigger = e.target.closest(SELECTORS.trigger);
      const closeBtn = e.target.closest(SELECTORS.close);

      if (trigger) {
        e.preventDefault();
        const popupId = trigger.dataset.popup;
        const popup = document.getElementById(popupId);
        if (popup) this.open(popup, trigger);
        return;
      }

      if (closeBtn) {
        const popup = closeBtn.closest(SELECTORS.popup);
        if (popup) this.close(popup);
        return;
      }

      const activePopup = e.target.closest(SELECTORS.popup);
      if (activePopup && !e.target.closest(SELECTORS.body)) {
        this.close(activePopup);
      }
    }

    handleKeydown(e) {
      if (e.key === 'Escape') {
        const activePopup = document.querySelector(`${SELECTORS.popup}.${CLASSES.active}`);
        if (activePopup) this.close(activePopup);
      }

      // Focus trap — Tab / Shift+Tab inside active popup
      if (e.key === 'Tab') {
        const activePopup = document.querySelector(`${SELECTORS.popup}.${CLASSES.active}`);
        if (!activePopup) return;

        const focusableElements = activePopup.querySelectorAll(FOCUSABLE_SELECTORS);
        if (!focusableElements.length) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    }

    open(popup, trigger = null) {
      if (!popup || this.isLocked) return;

      this.isLocked = true;
      setTimeout(() => {
        this.isLocked = false;
      }, this.speed);

      const activePopup = document.querySelector(`${SELECTORS.popup}.${CLASSES.active}`);

      if (activePopup) {
        // _close, not close — isLocked is already set for this switch
        this._close(activePopup, false);
      } else {
        bodyLock();
      }

      // Save trigger for focus return
      this._lastTrigger = trigger || document.activeElement;

      // ARIA
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-modal', 'true');
      // Name the dialog by its title (components/modals/_frame-start.html renders .popup__title with an id)
      const title = popup.querySelector('.popup__title[id]');
      if (title) popup.setAttribute('aria-labelledby', title.id);

      popup.classList.add(CLASSES.active);

      // Focus first focusable element inside popup, or the popup itself
      popup.setAttribute('tabindex', '-1');
      const focusable = popup.querySelector(FOCUSABLE_SELECTORS);
      (focusable || popup).focus();
    }

    close(popup, unlock = true) {
      if (!popup || this.isLocked) return;

      this.isLocked = true;
      setTimeout(() => {
        this.isLocked = false;
      }, this.speed);

      this._close(popup, unlock);
    }

    _close(popup, unlock = true) {
      popup.classList.remove(CLASSES.active);
      popup.removeAttribute('aria-modal');
      popup.removeAttribute('aria-labelledby');
      popup.removeAttribute('role');
      popup.removeAttribute('tabindex');

      // Return focus to trigger
      if (unlock && this._lastTrigger) {
        this._lastTrigger.focus();
        this._lastTrigger = null;
      }

      if (unlock) {
        bodyUnLock(this.speed);
      }
    }
  }

  App.Modal = Modal;
  App.modal = new Modal();
})();
