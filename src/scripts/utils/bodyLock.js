(() => {
  'use strict';

  const App = (window.App = window.App || {});

  const body = document.body;
  let unlockTimerId = null;
  let savedScrollY = 0;

  function bodyLock() {
    // Cancel any pending unlock
    if (unlockTimerId) {
      clearTimeout(unlockTimerId);
      unlockTimerId = null;
    }

    const wrapper = document.querySelector('.wrapper');
    if (!wrapper) return;

    const scrollbarWidth = window.innerWidth - wrapper.offsetWidth;
    const lockPadding = document.querySelectorAll('.is-lock-padding');

    lockPadding.forEach((elem) => {
      elem.dataset.originalPadding = elem.style.paddingRight;
      elem.style.paddingRight = `${parseFloat(getComputedStyle(elem).paddingRight) + scrollbarWidth}px`;
    });

    body.dataset.originalPadding = body.style.paddingRight;
    body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbarWidth}px`;

    // Save scroll position and lock with position:fixed (iOS Safari fix)
    savedScrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.classList.add('is-lock-scroll');
  }

  function bodyUnLock(speed = 0) {
    // Cancel any pending unlock
    if (unlockTimerId) {
      clearTimeout(unlockTimerId);
      unlockTimerId = null;
    }

    const unlock = () => {
      unlockTimerId = null;
      const lockPadding = document.querySelectorAll('.is-lock-padding');

      lockPadding.forEach((elem) => {
        elem.style.paddingRight = elem.dataset.originalPadding || '';
        delete elem.dataset.originalPadding;
      });

      body.style.paddingRight = body.dataset.originalPadding || '';
      delete body.dataset.originalPadding;

      // Restore scroll position (iOS Safari fix)
      body.style.removeProperty('position');
      body.style.removeProperty('top');
      body.style.removeProperty('left');
      body.style.removeProperty('right');
      body.classList.remove('is-lock-scroll');
      window.scrollTo(0, savedScrollY);
    };

    if (speed > 0) {
      unlockTimerId = setTimeout(unlock, speed);
    } else {
      unlock();
    }
  }

  Object.assign(App, { bodyLock, bodyUnLock });
})();
