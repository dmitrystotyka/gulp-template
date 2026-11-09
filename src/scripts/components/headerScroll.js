(() => {
  'use strict';

  const App = (window.App = window.App || {});

  const SELECTORS = {
    header: '.header',
  };

  const CLASSES = {
    scrolled: 'is-scroll',
  };

  class HeaderScroll {
    constructor(selector = SELECTORS.header) {
      this.header = document.querySelector(selector);
      if (!this.header) return;

      this.observer = null;
      this.sentinel = null;
      this.init();
    }

    init() {
      // Observe a zero-size sentinel at the top of the document instead of the
      // header itself — a fixed/sticky header always intersects the viewport,
      // so observing it directly would never toggle the class.
      this.sentinel = document.createElement('div');
      this.sentinel.setAttribute('aria-hidden', 'true');
      this.sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
      document.body.prepend(this.sentinel);

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.header.classList.toggle(CLASSES.scrolled, !entry.isIntersecting);
        },
        { threshold: 0 }
      );

      this.observer.observe(this.sentinel);
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.sentinel?.remove();
      this.sentinel = null;
      this.header?.classList.remove(CLASSES.scrolled);
    }
  }

  App.HeaderScroll = HeaderScroll;
  App.headerScroll = new HeaderScroll();
})();
