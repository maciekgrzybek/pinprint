document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('print-container');
  const sizeRadios = document.querySelectorAll('input[name="gridSize"]');
  const printBtn = document.getElementById('print-btn');

  let images = [];

  function loadImages() {
    chrome.storage.local.get(['pinPrintCollection'], (result) => {
      images = result.pinPrintCollection || [];
      renderGrid();
      // Only auto-print if we actually have images loaded
      if (images.length > 0) {
        setTimeout(() => {
          window.print();
        }, 1000); // Give it a second to render
      }
    });
  }

  function getGridSize() {
    let size = 'large';
    sizeRadios.forEach(radio => {
      if (radio.checked) {
        size = radio.value;
      }
    });
    return size;
  }

  function getItemsPerPage(size) {
    switch (size) {
      case 'large': return 4;  // 2x2
      case 'medium': return 9; // 3x3
      case 'small': return 16; // 4x4
      default: return 4;
    }
  }

  function renderGrid() {
    container.innerHTML = '';
    const size = getGridSize();
    const itemsPerPage = getItemsPerPage(size);

    // Group images into pages
    const pages = [];
    for (let i = 0; i < images.length; i += itemsPerPage) {
      pages.push(images.slice(i, i + itemsPerPage));
    }

    if (pages.length === 0) {
      container.innerHTML = '<p class="no-print" style="text-align: center;">No images to print.</p>';
      return;
    }

    pages.forEach((pageImages, index) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';

      const gridDiv = document.createElement('div');
      gridDiv.className = `grid grid-${size}`;

      pageImages.forEach(src => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid-item';

        const img = document.createElement('img');
        img.src = src;

        itemDiv.appendChild(img);
        gridDiv.appendChild(itemDiv);
      });

      pageDiv.appendChild(gridDiv);

      const footer = document.createElement('div');
      footer.className = 'footer';
      footer.textContent = 'Generated for private use via PinPrint';
      pageDiv.appendChild(footer);

      container.appendChild(pageDiv);
    });
  }

  sizeRadios.forEach(radio => {
    radio.addEventListener('change', renderGrid);
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });

  loadImages();
});
