/**
 * Dynamic Adapt
 *
 * Moves elements around the DOM at a given breakpoint.
 *
 * Format: data-da="selector, breakpoint, [...options]"
 *   selector   — CSS selector of the destination container (required)
 *   breakpoint — width in px (default 767)
 *   options    — order does NOT matter, detected by value:
 *     min | max             → breakpoint type (default max)
 *     first | last | number → position inside the container (default last)
 *
 * Examples:
 *   data-da=".footer, 768"              → to the end of .footer at ≤768px
 *   data-da=".sidebar, 1024, first"     → to the start of .sidebar at ≤1024px
 *   data-da=".nav, 768, min"            → to the end of .nav at ≥768px
 *   data-da=".nav, 768, min, first"     → to the start of .nav at ≥768px
 *   data-da=".nav, 768, first, min"     → same thing (order is irrelevant)
 *   data-da=".target, 480, 2"           → before the 3rd child at ≤480px
 */

const SELECTOR = '[data-da]';
const CLASS_NAME = '_dynamic_adapt_';

class DynamicAdapt {
  constructor() {
    this.objects = [];
    this.nodes = document.querySelectorAll(SELECTOR);

    if (!this.nodes.length) return;

    this.init();
  }

  /**
   * Parse data-da parameters, detecting type and position by value.
   */
  _parseOptions(data) {
    const parts = data.split(',').map((s) => s.trim());
    const destination = parts[0];
    const breakpoint = parts[1] || '767';

    let place = 'last';
    let type = 'max';

    // Remaining parameters are detected by value
    for (let idx = 2; idx < parts.length; idx++) {
      const val = parts[idx];

      if (val === 'min' || val === 'max') {
        type = val;
      } else if (val === 'first' || val === 'last') {
        place = val;
      } else if (!isNaN(val) && val !== '') {
        place = val;
      }
    }

    return { destination, breakpoint, place, type };
  }

  init() {
    this.nodes.forEach((node) => {
      const data = node.dataset.da.trim();
      const { destination, breakpoint, place, type } = this._parseOptions(data);

      const destElement = (() => {
        try {
          return document.querySelector(destination);
        } catch {
          console.error(`[DynamicAdapt] Invalid selector: "${destination}"`);
          return null;
        }
      })();

      if (!destElement) return;

      this.objects.push({
        element: node,
        parent: node.parentNode,
        destination: destElement,
        breakpoint,
        place,
        type,
        idx: this.getIndex(node.parentNode, node),
      });
    });

    // Group by unique "type + breakpoint" combinations
    const groups = new Map();

    this.objects.forEach((obj) => {
      const key = `${obj.type}-${obj.breakpoint}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(obj);
    });

    // Sort inside each group
    groups.forEach((items) => {
      const type = items[0].type;
      items.sort((a, b) => (type === 'min' ? a.breakpoint - b.breakpoint : b.breakpoint - a.breakpoint));
    });

    // Create media query listeners
    this._mediaListeners = [];

    groups.forEach((items, key) => {
      const type = key.split('-')[0];
      const bp = key.split('-').slice(1).join('-');
      const mediaQuery = window.matchMedia(`(${type}-width: ${bp}px)`);

      const handleChange = () => this.handleMedia(mediaQuery, items);
      mediaQuery.addEventListener('change', handleChange);
      this._mediaListeners.push({ mediaQuery, handleChange });
      handleChange();
    });
  }

  handleMedia(mediaQuery, objects) {
    if (mediaQuery.matches) {
      // Save all indices before moving (batch moves shift sibling positions)
      objects.forEach((obj) => {
        obj.idx = this.getIndex(obj.parent, obj.element);
      });
      objects.forEach((obj) => {
        this.moveTo(obj);
      });
    } else {
      objects.forEach((obj) => {
        if (obj.element.classList.contains(CLASS_NAME)) {
          this.moveBack(obj);
        }
      });
    }
  }

  moveTo(obj) {
    const { element, destination, place } = obj;
    if (!destination) return;

    element.classList.add(CLASS_NAME);

    if (place === 'last' || Number(place) >= destination.children.length) {
      destination.appendChild(element);
    } else if (place === 'first') {
      destination.prepend(element);
    } else {
      destination.children[place].before(element);
    }
  }

  moveBack(obj) {
    const { element, parent, idx } = obj;

    element.classList.remove(CLASS_NAME);

    if (parent.children[idx]) {
      parent.children[idx].before(element);
    } else {
      parent.appendChild(element);
    }
  }

  getIndex(parent, element) {
    return [...parent.children].indexOf(element);
  }

  destroy() {
    this.objects.forEach((obj) => {
      if (obj.element.classList.contains(CLASS_NAME)) {
        this.moveBack(obj);
      }
    });

    if (this._mediaListeners) {
      this._mediaListeners.forEach(({ mediaQuery, handleChange }) => {
        mediaQuery.removeEventListener('change', handleChange);
      });
      this._mediaListeners = [];
    }

    this.objects = [];
  }
}

export { DynamicAdapt };
export default new DynamicAdapt();
