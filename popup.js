document.addEventListener('DOMContentLoaded', () => {
  const countDisplay = document.getElementById('image-count');
  const clearBtn = document.getElementById('clear-btn');
  const generateBtn = document.getElementById('generate-btn');

  function updateCount() {
    chrome.storage.local.get(['pinPrintCollection'], (result) => {
      const collection = result.pinPrintCollection || [];
      countDisplay.textContent = collection.length;
    });
  }

  // Initial update
  updateCount();

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ pinPrintCollection: [] }, () => {
      updateCount();
    });
  });

  generateBtn.addEventListener('click', () => {
    chrome.storage.local.get(['pinPrintCollection'], (result) => {
      const collection = result.pinPrintCollection || [];
      if (collection.length === 0) {
        alert('No images collected yet. Go to Pinterest and click the + button on pins.');
        return;
      }

      chrome.tabs.create({ url: chrome.runtime.getURL('print.html') });
    });
  });
});
