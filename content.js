/* PinPrint Content Script */

function createAddButton() {
  const btn = document.createElement('button');
  btn.innerText = '+';
  btn.className = 'pinprint-add-btn';
  btn.title = 'Add to PinPrint';

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // The container of the image is usually a div, let's look for an image nearby.
    // We attach the button inside the pin container.
    const container = btn.closest('[data-test-id="pin-visual-wrapper"]') || btn.parentElement;
    if (!container) return;

    const img = container.querySelector('img');
    if (!img) return;

    // Some Pinterest images use srcset, we just grab src for simplicity, or the highest res one.
    const imgSrc = img.src;

    if (imgSrc) {
      saveImage(imgSrc, btn);
    }
  });

  return btn;
}

function saveImage(src, btn) {
  chrome.storage.local.get(['pinPrintCollection'], (result) => {
    let collection = result.pinPrintCollection || [];
    if (!collection.includes(src)) {
      collection.push(src);
      chrome.storage.local.set({ pinPrintCollection: collection }, () => {
        // Visual feedback
        const originalText = btn.innerText;
        btn.innerText = '✓';
        btn.style.backgroundColor = '#2ecc71';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.innerText = originalText;
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 1500);
      });
    } else {
      // Already added feedback
      const originalText = btn.innerText;
      btn.innerText = '!';
      btn.style.backgroundColor = '#f39c12';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }, 1500);
    }
  });
}

function injectButtons() {
  // Try to find Pinterest pin visual wrappers that don't have our button yet.
  const pins = document.querySelectorAll('[data-test-id="pin-visual-wrapper"]:not(.pinprint-injected)');

  pins.forEach(pin => {
    pin.classList.add('pinprint-injected');
    // Ensure the container is positioned so our absolute button works.
    if (window.getComputedStyle(pin).position === 'static') {
      pin.style.position = 'relative';
    }
    const btn = createAddButton();
    pin.appendChild(btn);
  });
}

// Observe DOM for new pins (infinite scroll)
const observer = new MutationObserver((mutations) => {
  let shouldInject = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldInject = true;
      break;
    }
  }
  if (shouldInject) {
    injectButtons();
  }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
injectButtons();
