document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('print-container');
  const printBtn = document.getElementById('print-btn');

  let images = [];

  function loadImages() {
    chrome.storage.local.get(['pinPrintCollection'], async (result) => {
      images = result.pinPrintCollection || [];
      await renderGrid();

      // Only auto-print if we actually have images loaded
      if (images.length > 0) {
        // A short timeout is still helpful to ensure the browser has fully painted the DOM
        setTimeout(() => {
          window.print();
        }, 500);
      }
    });
  }

  async function renderGrid() {
    container.innerHTML = '';

    if (images.length === 0) {
      container.innerHTML = '<p class="no-print" style="text-align: center;">No images to print.</p>';
      return;
    }

    // Preload all images to get their aspect ratios
    const preloadedImages = await Promise.all(images.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            src,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height
          });
        };
        img.onerror = () => {
          // Fallback if image fails to load
          resolve({ src, width: 1, height: 1, aspectRatio: 1 });
        };
        img.src = src;
      });
    }));

    // Group images into pages.
    // A4 paper is 210mm x 297mm.
    // To ensure compatibility with standard browser print margins (often ~10mm default),
    // we make the virtual page slightly smaller so it forces the whole content onto one printed page.
    // CSS .page has 10mm padding on all sides.
    // We assume an effective paper size of 200mm x 285mm to avoid triggering standard browser margins.
    // Usable width: 200 - 20 = 180mm
    // Usable height: 285 - 20 (padding) - 10 (footer space) = 255mm.
    const usableWidth = 180;
    const usableHeight = 255;
    const gap = 5; // 5mm gap between items and rows

    const pages = [];
    let currentPageRows = [];
    let currentPageHeight = 0;

    let currentRowImages = [];
    let currentRowAspectRatioSum = 0;

    // We build rows. A row should have enough images to not be taller than a fraction of the page,
    // or we max out at, say, 3-4 images to keep them visible.
    // For a row of images, they share the width. The gaps also take up width.
    // If a row has N images, there are (N-1) gaps.
    // Width taken by images = usableWidth - (N-1)*gap.
    // The height of the row = (usableWidth - (N-1)*gap) / sum(aspectRatios).

    for (const imgData of preloadedImages) {
      currentRowImages.push(imgData);
      currentRowAspectRatioSum += imgData.aspectRatio;

      const numImages = currentRowImages.length;
      const imagesWidth = usableWidth - (numImages - 1) * gap;
      const rowHeight = imagesWidth / currentRowAspectRatioSum;

      // Decide if we should close the current row.
      // E.g., if row height is reasonable (<= 1/3 of usable height) or we have 4 images.
    // Ensure rows aren't too massive vertically
      if (rowHeight <= usableHeight / 2 || numImages >= 4) {
        // Now check if this row fits on the current page
        // The total height added by this row includes the row height itself.
        // If there are already rows on the page, we also need to account for the gap between rows.
        const heightAdded = currentPageRows.length === 0 ? rowHeight : gap + rowHeight;

      // Use an epsilon (0.5mm) for float inaccuracies to ensure it fits safely
      if (currentPageHeight + heightAdded > usableHeight - 0.5 && currentPageRows.length > 0) {
          // Doesn't fit. Push current page and start a new one.
          pages.push(currentPageRows);

          // The row that didn't fit becomes the first row of the new page
          currentPageRows = [{ images: currentRowImages, height: rowHeight }];
          currentPageHeight = rowHeight;
        } else {
          // Fits on current page
          currentPageRows.push({ images: currentRowImages, height: rowHeight });
          currentPageHeight += heightAdded;
        }

        // Reset for next row
        currentRowImages = [];
        currentRowAspectRatioSum = 0;
      }
    }

    // Handle any leftover images that didn't form a "closed" row
    if (currentRowImages.length > 0) {
      const numImages = currentRowImages.length;
      const imagesWidth = usableWidth - (numImages - 1) * gap;
      // If it's a single image, it might be very tall, but we cap its height at max usable height
      let rowHeight = imagesWidth / currentRowAspectRatioSum;

      // If a row is taller than the page, constrain it
      if (rowHeight > usableHeight) {
          rowHeight = usableHeight;
      }

      const heightAdded = currentPageRows.length === 0 ? rowHeight : gap + rowHeight;

      // Use an epsilon (0.5mm) for float inaccuracies
      if (currentPageHeight + heightAdded > usableHeight - 0.5 && currentPageRows.length > 0) {
        pages.push(currentPageRows);
        currentPageRows = [{ images: currentRowImages, height: rowHeight }];
        currentPageHeight = rowHeight;
      } else {
        currentPageRows.push({ images: currentRowImages, height: rowHeight });
      }
    }

    // Push the last page
    if (currentPageRows.length > 0) {
      pages.push(currentPageRows);
    }

    // Render pages
    pages.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';

      const gridDiv = document.createElement('div');
      gridDiv.className = `grid`;

      page.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'masonry-row';
        // Enforce the calculated height strictly
        rowDiv.style.height = `${row.height}mm`;
        rowDiv.style.maxHeight = `${row.height}mm`;

        row.images.forEach(imgData => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'grid-item';

          itemDiv.style.flex = `${imgData.aspectRatio} 1 0`;

          const img = document.createElement('img');
          img.src = imgData.src;

          itemDiv.appendChild(img);
          rowDiv.appendChild(itemDiv);
        });

        gridDiv.appendChild(rowDiv);
      });

      pageDiv.appendChild(gridDiv);

      const footer = document.createElement('div');
      footer.className = 'footer';
      footer.textContent = 'Generated for private use via PinPrint';
      pageDiv.appendChild(footer);

      container.appendChild(pageDiv);
    });
  }

  printBtn.addEventListener('click', () => {
    window.print();
  });

  loadImages();
});
