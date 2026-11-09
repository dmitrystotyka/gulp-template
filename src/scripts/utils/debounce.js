(() => {
  'use strict';

  const App = (window.App = window.App || {});

  function debounce(func, wait = 300) {
    let timeout;
    let lastArgs;

    function executedFunction(...args) {
      lastArgs = args;
      const later = () => {
        clearTimeout(timeout);
        timeout = null;
        lastArgs = null;
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    }

    executedFunction.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
    };

    executedFunction.flush = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }
    };

    return executedFunction;
  }

  function throttle(func, wait = 300) {
    let isThrottled = false;
    let savedArgs = null;
    let timeoutId = null;

    function wrapper(...args) {
      if (isThrottled) {
        savedArgs = args;
        return;
      }

      func(...args);
      isThrottled = true;

      timeoutId = setTimeout(() => {
        isThrottled = false;
        if (savedArgs) {
          wrapper(...savedArgs);
          savedArgs = null;
        }
      }, wait);
    }

    wrapper.cancel = () => {
      clearTimeout(timeoutId);
      isThrottled = false;
      savedArgs = null;
      timeoutId = null;
    };

    wrapper.flush = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        isThrottled = false;
        timeoutId = null;
        if (savedArgs) {
          func(...savedArgs);
          savedArgs = null;
        }
      }
    };

    return wrapper;
  }

  Object.assign(App, { debounce, throttle });
})();
