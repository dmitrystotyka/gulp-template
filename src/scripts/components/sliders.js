/* global Swiper */

/**
 * Slider configuration (Swiper — load it via `vendors` in project.config.js).
 *
 * Shorthand options (expanded automatically):
 *   loop:       true | false          — looping (default false; true only when > 1 slide)
 *   pagination: true | false | {}     — bullets (true = default element, {} = custom options, false = none)
 *   navigation: true | false | {}     — arrows  (true = default elements, {} = custom options, false = none)
 *
 * Everything else is passed to Swiper as-is.
 */
const sliderConfigs = {
  // '.example-slider': {
  //   slidesPerView: 1,
  //   spaceBetween: 15,
  //   loop: true,
  //   pagination: true,
  //   navigation: true,
  //   breakpoints: {
  //     768: { slidesPerView: 2 },
  //     1200: { slidesPerView: 3 },
  //   },
  // },
};

class Sliders {
  constructor() {
    this.instances = new Map();
    this.init();
  }

  init() {
    // Check if Swiper is available
    if (typeof Swiper === 'undefined') {
      console.warn('[Sliders] Swiper is not loaded. Include Swiper library to use sliders.');
      return;
    }

    Object.entries(sliderConfigs).forEach(([selector, userConfig]) => {
      const sliders = document.querySelectorAll(selector);
      if (!sliders.length) return;

      sliders.forEach((slider, idx) => {
        const wrapper = slider.querySelector('.swiper-wrapper');
        const slidesCount = wrapper ? wrapper.children.length : 0;

        if (slidesCount < 1) return;

        const config = this._resolveConfig(slider, userConfig);

        try {
          const instance = new Swiper(slider, {
            ...config,
            on: {
              ...config.on,
              init: (swiper) => {
                this._toggleOverflow(swiper);
                config.on?.init?.(swiper);
              },
              resize: (swiper) => {
                this._toggleOverflow(swiper);
                config.on?.resize?.(swiper);
              },
              breakpoint: (swiper) => {
                this._toggleOverflow(swiper);
                config.on?.breakpoint?.(swiper);
              },
            },
          });

          this.instances.set(`${selector}-${idx}`, instance);
        } catch (error) {
          console.error(`[Sliders] Failed to initialize slider "${selector}":`, error);
        }
      });
    });
  }

  /**
   * Expand the shorthand options (pagination, navigation, loop)
   * into a full Swiper configuration.
   */
  _resolveConfig(sliderEl, userConfig) {
    const { pagination, navigation, loop, ...rest } = userConfig;

    const config = {
      grabCursor: true,
      speed: 500,
      spaceBetween: 15,
      slidesPerView: 1,
      watchOverflow: true,
      ...rest,
    };

    // Loop
    if (loop === true) {
      const wrapper = sliderEl.querySelector('.swiper-wrapper');
      const slidesCount = wrapper ? wrapper.children.length : 0;
      config.loop = slidesCount > 1;
    } else {
      config.loop = Boolean(loop);
    }

    // Pagination: true → default element, {} → custom options
    if (pagination === true) {
      config.pagination = {
        el: sliderEl.querySelector('.swiper-pagination') || '.swiper-pagination',
        clickable: true,
      };
    } else if (pagination && typeof pagination === 'object') {
      config.pagination = { clickable: true, ...pagination };
    }

    // Navigation: true → default elements, {} → custom options
    if (navigation === true) {
      config.navigation = {
        nextEl: sliderEl.querySelector('.swiper-button-next') || '.swiper-button-next',
        prevEl: sliderEl.querySelector('.swiper-button-prev') || '.swiper-button-prev',
      };
    } else if (navigation && typeof navigation === 'object') {
      config.navigation = { ...navigation };
    }

    return config;
  }

  /**
   * Hide navigation, pagination and scrollbar when there are not enough
   * slides to scroll (Swiper reports this as `isLocked`).
   */
  _toggleOverflow(swiper) {
    const { el } = swiper;
    const isOverflow = swiper.isLocked;

    el.classList.toggle('swiper--overflow', isOverflow);

    // Arrows
    if (swiper.navigation) {
      const { nextEl, prevEl } = swiper.navigation;
      [nextEl, prevEl].flat().forEach((arrow) => {
        if (arrow) arrow.style.display = isOverflow ? 'none' : '';
      });
    }

    // Pagination
    if (swiper.pagination?.el) {
      const paginationEls = Array.isArray(swiper.pagination.el) ? swiper.pagination.el : [swiper.pagination.el];
      paginationEls.forEach((pagEl) => {
        if (pagEl) pagEl.style.display = isOverflow ? 'none' : '';
      });
    }

    // Scrollbar
    if (swiper.scrollbar?.el) {
      const scrollbarEls = Array.isArray(swiper.scrollbar.el) ? swiper.scrollbar.el : [swiper.scrollbar.el];
      scrollbarEls.forEach((sbEl) => {
        if (sbEl) sbEl.style.display = isOverflow ? 'none' : '';
      });
    }
  }

  get(selector, idx = 0) {
    return this.instances.get(`${selector}-${idx}`);
  }

  destroy(selector, idx = 0) {
    const instance = this.get(selector, idx);
    if (instance) {
      instance.destroy();
      this.instances.delete(`${selector}-${idx}`);
    }
  }

  destroyAll() {
    this.instances.forEach((instance) => instance.destroy());
    this.instances.clear();
  }
}

export { Sliders };
export default new Sliders();
