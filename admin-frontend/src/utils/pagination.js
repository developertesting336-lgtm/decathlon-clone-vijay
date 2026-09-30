/**
 * Calculates a compact modern pagination range with ellipses.
 *
 * Example outputs (for totalPages = 22):
 * - Page 1:  [1, 2, 3, "...right", 21, 22]           -> < 1 2 3 ... 21 22 >
 * - Page 10: [1, "...left", 9, 10, 11, "...right", 22] -> < 1 ... 9 10 11 ... 22 >
 * - Page 22: [1, "...left", 20, 21, 22]              -> < 1 ... 20 21 22 >
 */
export const getPaginationRange = (currentPage, totalPages) => {
  if (!totalPages || totalPages <= 1) {
    return [1];
  }

  // When total pages is 7 or fewer, show all numbers without truncation
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Beginning pages
  if (currentPage <= 3) {
    const startPages = [1, 2, 3];
    if (currentPage === 3) {
      startPages.push(4);
    }
    return [...startPages, "...right", totalPages - 1, totalPages];
  }

  // Ending pages
  if (currentPage >= totalPages - 2) {
    const endPages = [totalPages - 2, totalPages - 1, totalPages];
    if (currentPage === totalPages - 2) {
      endPages.unshift(totalPages - 3);
    }
    return [1, "...left", ...endPages];
  }

  // Middle pages
  return [
    1,
    "...left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...right",
    totalPages,
  ];
};
