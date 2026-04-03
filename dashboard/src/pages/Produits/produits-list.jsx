import React, { useState, useEffect, useRef } from "react";
import Table from "@/components/shared/table/Table";
import axios from "axios";
import { config_url } from "@/utils/config";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import {
  FiEdit,
  FiTrash2,
  FiPackage,
  FiHash,
  FiTag,
  FiDollarSign,
  FiBarChart2,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiSave,
  FiX,
  FiDownload,
  FiSquare,
  FiUsers,
} from "react-icons/fi";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import api from "@/utils/axiosConfig";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
const MySwal = withReactContent(Swal);

const ProduitsList = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    totalSalesValue: 0,
    lowStock: 0,
    outOfStock: 0,
    avgSurface: 0,
  });
  const [selectedFornisseur, setSelectedFornisseur] = useState("all");
  const [fornisseurs, setFornisseurs] = useState([]);
  const [stockOperation, setStockOperation] = useState({
    show: false,
    produit: null,
    operation: "add",
    quantity: "",
  });
  const [editModal, setEditModal] = useState({
    show: false,
    produit: null,
    formData: {},
    loading: false,
  });
  const navigate = useNavigate();
  useEffect(() => {
    fetchProduits();
    fetchFornisseurs();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [produits]);

  const fetchProduits = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/produits`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProduits(response.data?.produits || []);
      setError("");
    } catch (error) {
      console.error("Error fetching produits:", error);
      if (error.response?.status === 403) {
        setError("Access denied. Please check your permissions.");
      } else {
        setError("Failed to fetch produits.");
      }
      setProduits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFornisseurs = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fornisseurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFornisseurs(response.data?.fornisseurs || []);
    } catch (error) {
      console.error("Error fetching fornisseurs:", error);
    }
  };

  const calculateStats = () => {
    const total = produits.length;
    const totalValue = produits.reduce(
      (sum, p) => sum + (p.qty * p.prix_achat || 0),
      0,
    );
    const totalSalesValue = produits.reduce((sum, p) => {
      if (p.prix_total) {
        return sum + parseFloat(p.prix_total);
      } else if (p.surface && p.prix_vente && p.qty) {
        return (
          sum +
          parseFloat(p.surface) * parseFloat(p.prix_vente) * parseInt(p.qty)
        );
      }
      return sum;
    }, 0);
    const lowStock = produits.filter((p) => p.qty > 0 && p.qty < 10).length;
    const outOfStock = produits.filter((p) => p.qty === 0).length;

    const produitsWithSurface = produits.filter((p) => p.surface > 0);
    const avgSurface =
      produitsWithSurface.length > 0
        ? produitsWithSurface.reduce(
            (sum, p) => sum + parseFloat(p.surface || 0),
            0,
          ) / produitsWithSurface.length
        : 0;

    setStats({
      total,
      totalValue: totalValue ? totalValue.toFixed(2) : "0.00",
      totalSalesValue: totalSalesValue ? totalSalesValue.toFixed(2) : "0.00",
      lowStock,
      outOfStock,
      avgSurface: avgSurface ? avgSurface.toFixed(4) : "0.0000",
    });
  };

  // Helper function to wrap text in PDF with collapsing support
  const wrapText = (doc, text, maxWidth, maxLines = 2, bold = false) => {
    if (bold && doc.getFont().fontName.includes("bold")) {
      // If already bold, use current font
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines.slice(0, maxLines);
    }

    const lines = doc.splitTextToSize(text, maxWidth);

    // If text exceeds maxLines, truncate and add ellipsis
    if (lines.length > maxLines) {
      const truncatedLines = lines.slice(0, maxLines);
      // Add ellipsis to last line if it fits
      const lastLine = truncatedLines[maxLines - 1];
      const ellipsisWidth =
        (doc.getStringUnitWidth("...") * doc.internal.getFontSize()) /
        doc.internal.scaleFactor;
      const lineWidth =
        (doc.getStringUnitWidth(lastLine) * doc.internal.getFontSize()) /
        doc.internal.scaleFactor;

      if (lineWidth + ellipsisWidth < maxWidth) {
        truncatedLines[maxLines - 1] = lastLine + "...";
      } else {
        // Remove last character(s) to make room for ellipsis
        let newLine = lastLine;
        while (
          newLine.length > 0 &&
          (doc.getStringUnitWidth(newLine + "...") *
            doc.internal.getFontSize()) /
            doc.internal.scaleFactor >
            maxWidth
        ) {
          newLine = newLine.slice(0, -1);
        }
        truncatedLines[maxLines - 1] = newLine + "...";
      }
      return truncatedLines;
    }
    return lines;
  };

  // Improved PDF Download Function with optimized text wrapping
  const downloadPDF = () => {
    if (filteredProduits.length === 0) {
      topTost("Aucun produit à exporter", "error");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;

    // Header Section
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVENTAIRE DES PRODUITS", pageWidth / 2, 18, { align: "center" });

    doc.setTextColor(230, 230, 230);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Généré le: ${dateStr}`, pageWidth / 2, 26, { align: "center" });

    // Table Configuration with dynamic column adjustments
    const startY = 40;
    const headers = [
      "Code",
      "Désignation",
      "Dimensions (mm)",
      "Quantite",
      "Prix Achat",
      "Total Montant",
    ];

    // Analyze maximum code length to adjust column width
    const maxCodeLength = Math.max(
      ...filteredProduits.map((p) => (p.reference ? p.reference.length : 0)),
    );

    // Dynamic column widths based on content analysis
    let codeColWidth = 20;
    let designationColWidth = 50;
    let dimensionsColWidth = 35;
    let surfaceColWidth = 25;
    let prixAchatColWidth = 30;
    let totalColWidth = 30;

    // Adjust code column if codes are very long
    if (maxCodeLength > 25) {
      codeColWidth = Math.min(35, 10 + maxCodeLength * 0.8);
      designationColWidth = Math.max(40, 50 - (codeColWidth - 20));
    }

    const colWidths = [
      codeColWidth,
      designationColWidth,
      dimensionsColWidth,
      surfaceColWidth,
      prixAchatColWidth,
      totalColWidth,
    ];
    const colAligns = ["left", "left", "center", "center", "right", "right"];
    const colPositions = [];
    let pos = margin;
    colWidths.forEach((w) => {
      colPositions.push(pos);
      pos += w;
    });

    let currentY = startY;
    const maxY = pageHeight - 30;
    let isFirstPage = true;

    // Function to draw table header
    const drawHeader = (y) => {
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, y, usableWidth, 12, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      headers.forEach((header, i) => {
        const x = colPositions[i];
        const align = colAligns[i];
        const cellCenter = x + colWidths[i] / 2;

        if (align === "center") {
          doc.text(header, cellCenter, y + 8, { align: "center" });
        } else if (align === "right") {
          doc.text(header, x + colWidths[i] - 3, y + 8, { align: "right" });
        } else {
          // For left-aligned headers, wrap if needed
          const headerLines = wrapText(doc, header, colWidths[i] - 6, 1, true);
          doc.text(headerLines[0], x + 3, y + 8, { align: "left" });
        }
      });
    };

    // Draw initial header
    drawHeader(currentY);
    currentY += 12;

    // Function to calculate maximum row height for a product
    const calculateRowHeight = (produit) => {
      const designation = produit.designation || "-";
      const code = produit.reference || "-";

      // Wrap code text (allow max 2 lines for long codes)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const codeLines = wrapText(doc, code, colWidths[0] - 6, 2, true);

      // Wrap designation text (max 2 lines)
      doc.setFont("helvetica", "normal");
      const designationLines = wrapText(
        doc,
        designation,
        colWidths[1] - 6,
        2,
        false,
      );

      // Determine the maximum number of lines between code and designation
      const maxLines = Math.max(codeLines.length, designationLines.length);
      const lineHeight = 4;
      const minRowHeight = 10;

      return Math.max(minRowHeight, maxLines * lineHeight + 4);
    };

    // Process each product
    filteredProduits.forEach((produit, index) => {
      const designation = produit.designation || "-";
      const code = produit.reference || "-";
      const dimensions =
        produit.L1 && produit.L2 ? `${produit.L1} x ${produit.L2}` : "-";
      const surface = produit.surface
        ? parseFloat(produit.surface).toFixed(4)
        : "-";
      const prixAchat = parseFloat(produit.prix_achat || 0).toFixed(2) + " DH";
      const totalMontant =
        (
          parseFloat(produit.surface || 0) * parseFloat(produit.prix_achat || 0)
        ).toFixed(2) + " DH";

      // Calculate row height
      const calculatedHeight = calculateRowHeight(produit);

      // Check if we need a new page
      if (currentY + calculatedHeight > maxY) {
        doc.addPage();
        currentY = 15;
        isFirstPage = false;
        drawHeader(currentY);
        currentY += 12;
      }

      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, currentY, usableWidth, calculatedHeight, "F");
      }

      // Draw cell borders
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);

      // Draw horizontal borders for this row
      doc.line(margin, currentY, margin + usableWidth, currentY); // Top border
      doc.line(
        margin,
        currentY + calculatedHeight,
        margin + usableWidth,
        currentY + calculatedHeight,
      ); // Bottom border

      // Draw vertical borders between columns
      for (let i = 0; i <= colWidths.length; i++) {
        let xPos = margin;
        for (let j = 0; j < i; j++) {
          xPos += colWidths[j];
        }
        doc.line(xPos, currentY, xPos, currentY + calculatedHeight);
      }

      // Prepare text content
      const lineHeight = 4;
      const baseTextY = currentY + 5;

      // CODE COLUMN - Handle multi-line codes
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const codeLines = wrapText(doc, code, colWidths[0] - 6, 2, true);

      codeLines.forEach((line, lineIndex) => {
        doc.setTextColor(50, 50, 50);
        const yPos = baseTextY + lineIndex * lineHeight;

        // Center vertically if code has fewer lines than row height allows
        if (codeLines.length === 1 && calculatedHeight > 12) {
          doc.text(line, colPositions[0] + 3, currentY + calculatedHeight / 2, {
            align: "left",
          });
        } else {
          doc.text(line, colPositions[0] + 3, yPos, { align: "left" });
        }
      });

      // DESIGNATION COLUMN
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const designationLines = wrapText(
        doc,
        designation,
        colWidths[1] - 6,
        2,
        false,
      );

      designationLines.forEach((line, lineIndex) => {
        const yPos = baseTextY + lineIndex * lineHeight;

        // Center vertically if designation has fewer lines
        if (designationLines.length === 1 && calculatedHeight > 12) {
          doc.text(line, colPositions[1] + 3, currentY + calculatedHeight / 2, {
            align: "left",
          });
        } else {
          doc.text(line, colPositions[1] + 3, yPos, { align: "left" });
        }
      });

      // DIMENSIONS COLUMN
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      const dimY = baseTextY;
      if (calculatedHeight > 12) {
        doc.text(
          dimensions,
          colPositions[2] + colWidths[2] / 2,
          currentY + calculatedHeight / 2,
          {
            align: "center",
          },
        );
      } else {
        doc.text(dimensions, colPositions[2] + colWidths[2] / 2, dimY, {
          align: "center",
        });
      }

      // SURFACE (QUANTITE) COLUMN
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      const surfaceY = baseTextY;
      if (calculatedHeight > 12) {
        doc.text(
          surface,
          colPositions[3] + colWidths[3] / 2,
          currentY + calculatedHeight / 2,
          {
            align: "center",
          },
        );
      } else {
        doc.text(surface, colPositions[3] + colWidths[3] / 2, surfaceY, {
          align: "center",
        });
      }

      // PRIX ACHAT COLUMN - Center vertically
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);

      const prixY = baseTextY;
      if (calculatedHeight > 12) {
        doc.text(
          prixAchat,
          colPositions[4] + colWidths[4] - 3,
          currentY + calculatedHeight / 2,
          {
            align: "right",
          },
        );
      } else {
        doc.text(prixAchat, colPositions[4] + colWidths[4] - 3, prixY, {
          align: "right",
        });
      }

      // TOTAL MONTANT COLUMN
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(8);

      const totalY = baseTextY;
      if (calculatedHeight > 12) {
        doc.text(
          totalMontant,
          colPositions[5] + colWidths[5] - 3,
          currentY + calculatedHeight / 2,
          {
            align: "right",
          },
        );
      } else {
        doc.text(totalMontant, colPositions[5] + colWidths[5] - 3, totalY, {
          align: "right",
        });
      }

      currentY += calculatedHeight;
    });

    currentY += 3;

    // Summary calculation
    const totalMontantGlobal = filteredProduits.reduce(
      (sum, p) =>
        sum + parseFloat(p.surface || 0) * parseFloat(p.prix_achat || 0),
      0,
    );

    // Check space for total
    if (currentY + 15 > maxY) {
      doc.addPage();
      currentY = 15;
    }

    // Total section with gradient effect
    doc.setFillColor(236, 240, 241);
    doc.rect(margin, currentY, usableWidth, 15, "F");

    // Total borders with thicker line
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.rect(margin, currentY, usableWidth, 15);

    // Total text - BOLD and prominent
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    // Summary info
    doc.text(
      `Total produits listés: ${filteredProduits.length} | Montant Global Total: ${totalMontantGlobal.toFixed(2)} DH`,
      margin + 5,
      currentY + 9,
    );

    // Footer with improved styling
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer text
      doc.text(`Inventaire des Produits - ${dateStr}`, margin, pageHeight - 10);
      doc.text(
        `Page ${i} / ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" },
      );
    }

    // Save PDF
    doc.save(
      `inventaire_produits_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    topTost("PDF téléchargé avec succès!", "success");
  };

  const handleDeleteProduit = async (produitId, produitName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>{produitName}</strong> ?
        </p>
      ),
      html: `
        <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
        <p class="text-danger"><small>Cette action est irréversible.</small></p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/produits/${produitId}`);
        setProduits((prev) => prev.filter((p) => p.id !== produitId));

        MySwal.fire({
          title: <p>Supprimé!</p>,
          text: `${produitName} a été supprimé avec succès.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text:
            error.response?.data?.message ||
            "Échec de la suppression du produit.",
          icon: "error",
        });
      }
    }
  };

  const handleEditClick = (produit) => {
    setEditModal({
      show: true,
      produit,
      formData: {
        reference: produit.reference,
        designation: produit.designation,
        L1: produit.L1 || "",
        L2: produit.L2 || "",
        surface: produit.surface || 0,
        prix_achat: produit.prix_achat,
        prix_vente: produit.prix_vente,
        prix_total: produit.prix_total || "",
        prix_vente_min: produit.prix_vente_min || "",
        prix_vente_max: produit.prix_vente_max || "",
        qty: produit.qty,
        fornisseurId: produit.fornisseurId || "",
        observation: produit.observation || "",
      },
      loading: false,
    });
  };

  const handleEditSubmit = async () => {
    if (!editModal.formData.reference || !editModal.formData.designation) {
      topTost("Veuillez remplir tous les champs obligatoires", "error");
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, loading: true }));

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await api.put(
        `/api/produits/${editModal.produit.id}`,
        editModal.formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProduits((prev) =>
        prev.map((p) => {
          if (p.id === editModal.produit.id) {
            return { ...p, ...editModal.formData };
          }
          return p;
        }),
      );

      MySwal.fire({
        title: "Succès!",
        text: "Produit mis à jour avec succès",
        icon: "success",
      });

      setEditModal({
        show: false,
        produit: null,
        formData: {},
        loading: false,
      });
    } catch (error) {
      console.error("Update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du produit",
        "error",
      );
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStockOperation = (produit, operation) => {
    setStockOperation({
      show: true,
      produit,
      operation,
      quantity: "",
    });
  };

  const confirmStockUpdate = async () => {
    if (!stockOperation.quantity || parseInt(stockOperation.quantity) <= 0) {
      topTost("Veuillez entrer une quantité valide", "error");
      return;
    }

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await api.patch(
        `/api/produits/${stockOperation.produit.id}/stock`,
        {
          qty: stockOperation.quantity,
          operation: stockOperation.operation,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Refresh produits to get updated values
      fetchProduits();

      MySwal.fire({
        title: "Succès!",
        text: "Stock mis à jour avec succès",
        icon: "success",
      });

      setStockOperation({
        show: false,
        produit: null,
        operation: "add",
        quantity: "",
      });
    } catch (error) {
      console.error("Stock update error:", error);
      topTost(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du stock",
        "error",
      );
    }
  };

  // Filter produits
  const filteredProduits = produits.filter((produit) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        produit.reference?.toLowerCase().includes(searchLower) ||
        produit.designation?.toLowerCase().includes(searchLower) ||
        (produit.L1 &&
          produit.L2 &&
          `${produit.L1} x ${produit.L2}`.includes(searchLower)) ||
        produit.surface?.toString().includes(searchLower) ||
        produit.fornisseur?.nom_complete?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    if (
      selectedFornisseur !== "all" &&
      produit.fornisseurId != selectedFornisseur
    ) {
      return false;
    }

    return true;
  });

  const columns = [
    {
      accessorKey: "reference",
      header: () => (
        <span>
          <FiHash className="me-2" />
          Référence
        </span>
      ),
      cell: (info) => <span className="fw-semibold">{info.getValue()}</span>,
    },
    {
      accessorKey: "designation",
      header: () => (
        <span>
          <FiPackage className="me-2" />
          Désignation
        </span>
      ),
      cell: (info) => {
        const designation = info.getValue();
        return (
          <div
            className="text-truncate"
            style={{ maxWidth: "250px" }}
            title={designation}
          >
            {designation}
          </div>
        );
      },
    },
    {
      accessorKey: "dimensions",
      header: () => <span>Dimensions (mm)</span>,
      cell: (info) => {
        const produit = info.row.original;
        if (produit.L1 && produit.L2) {
          return (
            <span>
              {produit.L1} x {produit.L2}
            </span>
          );
        }
        return <span className="text-muted">-</span>;
      },
    },
    {
      accessorKey: "surface",
      header: () => (
        <span>
          <FiSquare className="me-2" />
          Quantite /Stock
        </span>
      ),
      cell: (info) => {
        const surface = info.row.original.surface;
        if (surface > 0) {
          return <span>{parseFloat(surface).toFixed(4)}</span>;
        }
        return <span className="text-muted">-</span>;
      },
    },
    // {
    //   accessorKey: "qty",
    //   header: () => (
    //     <span>
    //       <FiTag className="me-2" />
    //       Stock
    //     </span>
    //   ),
    //   cell: (info) => {
    //     const qty = info.getValue();
    //     let badgeClass = "success";
    //     if (qty === 0) badgeClass = "danger";
    //     else if (qty < 10) badgeClass = "warning";

    //     return (
    //       <div className="d-flex align-items-center gap-2">
    //         <span
    //           className={`badge bg-${badgeClass} bg-opacity-10 text-white fs-6`}
    //         >
    //           {qty} unités
    //         </span>
    //         <div className="btn-group btn-group-sm gap-2">
    //           <button
    //             className="btn btn-outline-success btn-sm"
    //             onClick={() => handleStockOperation(info.row.original, "add")}
    //             title="Ajouter au stock"
    //           >
    //             <FiPlus size={12} />
    //           </button>
    //           <button
    //             className="btn btn-outline-danger btn-sm"
    //             onClick={() =>
    //               handleStockOperation(info.row.original, "subtract")
    //             }
    //             title="Retirer du stock"
    //             disabled={qty === 0}
    //           >
    //             <FiMinus size={12} />
    //           </button>
    //         </div>
    //       </div>
    //     );
    //   },
    // },
    {
      accessorKey: "prix_achat",
      header: () => (
        <span>
          <FiDollarSign className="me-2" />
          Prix Achat
        </span>
      ),
      cell: (info) => (
        <span className="fw-medium">
          {parseFloat(info.getValue()).toFixed(2)} DH
        </span>
      ),
    },
    {
      accessorKey: "prix_vente",
      header: () => (
        <span>
          <FiDollarSign className="me-2" />
          Prix Vente
        </span>
      ),
      cell: (info) => (
        <span className="fw-bold text-success">
          {parseFloat(info.getValue()).toFixed(2)} DH
        </span>
      ),
    },
    {
      id: "total_montant",
      header: () => (
        <span>
          <FiBarChart2 className="me-2" />
          Total Montant
        </span>
      ),
      cell: ({ row }) => {
        const total = (
          parseFloat(row.original.surface || 0) *
          parseFloat(row.original.prix_achat || 0)
        ).toFixed(2);
        return <span className="fw-bold text-primary">{total} DH</span>;
      },
    },

    // {
    //   accessorKey: "fournisseur",
    //   header: () => (
    //     <span>
    //       <FiUsers className="me-2" />
    //       Fournisseur
    //     </span>
    //   ),
    //   cell: (info) => {
    //     const produit = info.row.original;
    //     if (produit.fornisseur) {
    //       return (
    //         <span
    //           className="text-truncate"
    //           title={produit.fornisseur.nom_complete}
    //         >
    //           {produit.fornisseur.nom_complete}
    //         </span>
    //       );
    //     }
    //     return <span className="text-muted">-</span>;
    //   },
    // },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const produit = row.original;
        const { id, reference, designation } = produit;

        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClick(produit)}
              title="Modifier"
            >
              <FiEdit />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() =>
                handleDeleteProduit(id, `${reference} - ${designation}`)
              }
              title="Supprimer"
            >
              <FiTrash2 />
            </button>
          </div>
        );
      },
      meta: {
        headerClassName: "text-center",
      },
    },
  ];

  if (loading) {
    return (
      <div className="main-content">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "300px" }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Chargement des produits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <PageHeader
          title="Gestion des Produits"
          subtitle="Liste complète de tous les produits"
          breadcrumb={[
            { label: "Dashboard", link: "/dashboard" },
            { label: "Produits", active: true },
          ]}
        >
          <div className="d-flex gap-2">
            <button
              onClick={downloadPDF}
              className="btn btn-success"
              disabled={filteredProduits.length === 0}
              title="Télécharger PDF"
            >
              <FiDownload className="me-2" />
              Exporter PDF
            </button>

            <button
              onClick={() => {
                navigate("/produits/create");
              }}
              className="btn btn-primary"
            >
              <FiPackage className="me-2" />
              Ajouter un Produit
            </button>
          </div>
        </PageHeader>

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            <strong>Erreur!</strong> {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="row mt-4 mb-4 fs-5">
          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Total Produits
                    </p>
                    <h4 className="mb-0">{stats.total}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiPackage className="avatar-title text-primary fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Valeur Stock
                    </p>
                    <h4 className="mb-0">{stats.totalValue} DH</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiDollarSign className="avatar-title text-success fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <p className="text-uppercase fw-medium text-muted mb-0">
                      Stock Bas
                    </p>
                    <h4 className="mb-0">{stats.lowStock}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <FiShoppingCart className="avatar-title text-warning fs-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="search-box">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Rechercher Par Produit, Dimensions, Surface..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <i className="ri-search-line search-icon"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Liste des Produits</h5>
                {filteredProduits.length > 0 && (
                  <small className="text-muted">
                    {filteredProduits.length} produit(s) trouvé(s)
                  </small>
                )}
              </div>
              <div className="card-body">
                {filteredProduits.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-4">
                      <div className="avatar-title bg-light text-primary rounded-circle">
                        <FiPackage className="fs-24" />
                      </div>
                    </div>
                    <h5>Aucun produit trouvé</h5>
                    <p className="text-muted">
                      {searchTerm || selectedFornisseur !== "all"
                        ? "Aucun résultat pour votre recherche"
                        : "Commencez par ajouter votre premier produit"}
                    </p>
                    {!searchTerm && selectedFornisseur === "all" && (
                      <button
                        onClick={() => {
                          navigate("/produits/create");
                        }}
                        className="btn btn-primary"
                      >
                        <FiPackage className="me-2" />
                        Ajouter un Produit
                      </button>
                    )}
                  </div>
                ) : (
                  <Table
                    data={filteredProduits}
                    columns={columns}
                    searchable={false}
                    pagination={true}
                    pageSize={10}
                  />
                )}
              </div>
              {filteredProduits.length > 0 && (
                <div className="card-footer">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <small className="text-muted">
                        Affichage de 1 à {Math.min(filteredProduits.length, 10)}{" "}
                        sur {filteredProduits.length} produits
                      </small>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex justify-content-end gap-4">
                        <small className="text-muted">
                          <FiShoppingCart className="me-1" />
                          {stats.lowStock} stock bas
                        </small>
                        <small className="text-muted">
                          <FiTag className="me-1" />
                          {stats.outOfStock} rupture
                        </small>
                        <small className="text-muted">
                          <FiDollarSign className="me-1" />
                          {stats.totalValue} DH valeur stock
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editModal.show && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FiEdit className="me-2" />
                  Modifier le produit: {editModal.produit.reference}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      produit: null,
                      formData: {},
                      loading: false,
                    })
                  }
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Référence <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.reference}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            reference: e.target.value,
                          },
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fournisseur</label>
                    <select
                      className="form-select"
                      value={editModal.formData.fornisseurId}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            fornisseurId: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {fornisseurs.map((fornisseur) => (
                        <option key={fornisseur.id} value={fornisseur.id}>
                          {fornisseur.nom_complete}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      Désignation <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.formData.designation}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            designation: e.target.value,
                          },
                        }))
                      }
                      required
                    />
                  </div>

                  {/* Dimensions */}
                  <div className="col-md-3">
                    <label className="form-label">Longueur L1 (mm)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editModal.formData.L1}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            L1: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Largeur L2 (mm)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editModal.formData.L2}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            L2: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Quantite (m²)</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      className="form-control"
                      value={editModal.formData.surface}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            surface: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Stock</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editModal.formData.qty}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            qty: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* Prices */}
                  <div className="col-md-4">
                    <label className="form-label">
                      Prix d'achat (DH) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_achat}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_achat: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        required
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      Prix de vente (DH) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_vente}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_vente: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        required
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Prix total (DH)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_total}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_total: e.target.value,
                            },
                          }))
                        }
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                    <small className="text-muted">
                      Laissez vide pour auto-calcul
                    </small>
                  </div>

                  {/* Price ranges */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Prix vente minimum (DH)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_vente_min}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_vente_min: e.target.value,
                            },
                          }))
                        }
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Prix vente maximum (DH)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editModal.formData.prix_vente_max}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              prix_vente_max: e.target.value,
                            },
                          }))
                        }
                      />
                      <span className="input-group-text">DH</span>
                    </div>
                  </div>

                  {/* Margin info */}
                  <div className="col-12">
                    <div className="alert alert-info">
                      <div className="d-flex justify-content-between">
                        <span>
                          Marge:{" "}
                          {(
                            ((editModal.formData.prix_vente -
                              editModal.formData.prix_achat) /
                              editModal.formData.prix_achat) *
                              100 || 0
                          ).toFixed(1)}
                          %
                        </span>
                        <span>
                          Valeur stock:{" "}
                          {(
                            editModal.formData.qty *
                            editModal.formData.prix_achat
                          ).toFixed(2)}{" "}
                          DH
                        </span>
                        {editModal.formData.surface > 0 &&
                          editModal.formData.prix_vente > 0 && (
                            <span>
                              Prix total calc:{" "}
                              {(
                                editModal.formData.surface *
                                editModal.formData.prix_vente *
                                editModal.formData.qty
                              ).toFixed(2)}{" "}
                              DH
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setEditModal({
                      show: false,
                      produit: null,
                      formData: {},
                      loading: false,
                    })
                  }
                  disabled={editModal.loading}
                >
                  <FiX className="me-2" />
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEditSubmit}
                  disabled={editModal.loading}
                >
                  {editModal.loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Operation Modal */}
      {stockOperation.show && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {stockOperation.operation === "add"
                    ? "Ajouter au stock"
                    : stockOperation.operation === "subtract"
                      ? "Retirer du stock"
                      : "Définir le stock"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setStockOperation({
                      show: false,
                      produit: null,
                      operation: "add",
                      quantity: "",
                    })
                  }
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Produit: <strong>{stockOperation.produit.reference}</strong>
                  <br />
                  Stock actuel:{" "}
                  <strong>{stockOperation.produit.qty} unités</strong>
                </p>
                {stockOperation.produit.surface > 0 && (
                  <p className="text-muted small">
                    Surface:{" "}
                    {parseFloat(stockOperation.produit.surface).toFixed(4)} m²
                  </p>
                )}
                <div className="mb-3">
                  <label className="form-label">
                    Quantité{" "}
                    {stockOperation.operation === "add"
                      ? "à ajouter"
                      : stockOperation.operation === "subtract"
                        ? "à retirer"
                        : "du nouveau stock"}
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={stockOperation.quantity}
                    onChange={(e) =>
                      setStockOperation((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setStockOperation({
                      show: false,
                      produit: null,
                      operation: "add",
                      quantity: "",
                    })
                  }
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmStockUpdate}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper function for toast notifications
const topTost = (message, type = "success") => {
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  toast.fire({
    icon: type,
    title: message,
  });
};

export default ProduitsList;
