document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('print-container');
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
    // We'll estimate the layout using flex rows. A row will try to fill 100% width.
    // The height of a row is roughly proportional to the inverse of the sum of aspect ratios.
    // Max printable height per page (297mm - 20mm padding - 10mm footer space)
    // We will use a conceptual height unit here, based on an assumed row width.

    // For flex basis aspect-ratio layout:
    // row_height = row_width / sum(aspect_ratios)

    const pages = [];
    let currentPage = [];
    const assumedWidth = 1000; // arbitrary unit for calculation
    const maxPageHeight = 1414; // A4 ratio is ~ 1:1.414. So height is 1.414 * width

    // We will build rows one by one.
    let currentRow = [];
    let currentRowAspectRatioSum = 0;

    // Target height per row (approx). We don't want rows to be too tall or too short.
    const targetRowHeight = maxPageHeight / 3;

    for (const imgData of preloadedImages) {
      currentRow.push(imgData);
      currentRowAspectRatioSum += imgData.aspectRatio;

      const estimatedRowHeight = assumedWidth / currentRowAspectRatioSum;

      // If adding this image makes the row height reasonably small (so it fits width-wise),
      // we end the row and check page height.
      // We aim for rows that aren't massively tall.
      if (estimatedRowHeight <= targetRowHeight || currentRow.length >= 4) {
        // Calculate the height this row will actually take on the page
        const rowHeight = maxPageHeight * (estimatedRowHeight / assumedWidth); // normalized

        // Sum up the heights of rows currently on the page
        const currentPageHeight = currentPage.reduce((sum, row) => sum + row.height, 0);

        if (currentPageHeight + rowHeight > maxPageHeight * 0.95 && currentPage.length > 0) {
          // This row pushes us over the page limit, start a new page
          pages.push(currentPage);
          currentPage = [{ images: currentRow, height: rowHeight }];
        } else {
          currentPage.push({ images: currentRow, height: rowHeight });
        }

        // Reset row
        currentRow = [];
        currentRowAspectRatioSum = 0;
      }
    }

    // Handle any leftover images in the last row
    if (currentRow.length > 0) {
      const estimatedRowHeight = assumedWidth / currentRowAspectRatioSum;
      const rowHeight = maxPageHeight * (estimatedRowHeight / assumedWidth);
      const currentPageHeight = currentPage.reduce((sum, row) => sum + row.height, 0);

      if (currentPageHeight + rowHeight > maxPageHeight * 0.95 && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [{ images: currentRow, height: rowHeight }];
      } else {
        currentPage.push({ images: currentRow, height: rowHeight });
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
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

        row.images.forEach(imgData => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'grid-item';

          // Flex-grow based on aspect ratio ensures items in a row share width correctly
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
