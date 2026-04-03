import React, { useState } from "react";

const TablePagination = ({ table }) => {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {/* Info */}
      <span style={{ fontSize: 13, color: "var(--bs-secondary-color)" }}>
        Showing {pageIndex * table.getState().pagination.pageSize + 1}–
        {Math.min(
          (pageIndex + 1) * table.getState().pagination.pageSize,
          table.getRowCount(),
        )}{" "}
        of {table.getRowCount()} entries
      </span>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Previous */}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          ← Previous
        </button>

        {/* Page numbers */}
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            className={`btn btn-sm ${i === pageIndex ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => table.setPageIndex(i)}
          >
            {i + 1}
          </button>
        ))}

        {/* Next */}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
