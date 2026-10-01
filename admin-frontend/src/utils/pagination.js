/**
 * Calculates a compact modern pagination range showing the first 2 numbers,
 * ellipses (...), and the last 2 numbers.
 *
 * Example outputs (for totalPages = 7):
 * - Page 1: [1, 2, "...right", 6, 7]             -> < 1 2 ... 6 7 >
 * - Page 2: [1, 2, "...right", 6, 7]             -> < 1 2 ... 6 7 >
 * - Page 3: [1, 2, 3, "...right", 6, 7]          -> < 1 2 3 ... 6 7 >
 * - Page 4: [1, 2, "...left", 4, "...right", 6, 7] -> < 1 2 ... 4 ... 6 7 >
 * - Page 5: [1, 2, "...left", 5, 6, 7]          -> < 1 2 ... 5 6 7 >
 * - Page 6: [1, 2, "...left", 6, 7]             -> < 1 2 ... 6 7 >
 * - Page 7: [1, 2, "...left", 6, 7]             -> < 1 2 ... 6 7 >
 */
export const getPaginationRange = (currentPage, totalPages) => {
  if (!totalPages || totalPages <= 1) {
    return [1];
  }

  // When total pages is 4 or fewer, show all numbers without truncation
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // When total pages is 5
  if (totalPages === 5) {
    if (currentPage <= 2) {
      return [1, 2, "...right", 4, 5];
    }
    if (currentPage >= 4) {
      return [1, 2, "...left", 4, 5];
    }
    return [1, 2, 3, 4, 5];
  }

  // When total pages > 5:
  // On first 2 pages: show first 2 ... and last 2
  if (currentPage <= 2) {
    return [1, 2, "...right", totalPages - 1, totalPages];
  }

  // On last 2 pages: show first 2 ... and last 2
  if (currentPage >= totalPages - 1) {
    return [1, 2, "...left", totalPages - 1, totalPages];
  }

  // On page 3: adjacent to page 2, so [1, 2, 3, "...", totalPages - 1, totalPages]
  if (currentPage === 3) {
    return [1, 2, 3, "...right", totalPages - 1, totalPages];
  }

  // On page (totalPages - 2): adjacent to (totalPages - 1), so [1, 2, "...", totalPages - 2, totalPages - 1, totalPages]
  if (currentPage === totalPages - 2) {
    return [1, 2, "...left", totalPages - 2, totalPages - 1, totalPages];
  }

  // Middle pages: [1, 2, "...left", currentPage, "...right", totalPages - 1, totalPages]
  return [
    1,
    2,
    "...left",
    currentPage,
    "...right",
    totalPages - 1,
    totalPages,
  ];
};

