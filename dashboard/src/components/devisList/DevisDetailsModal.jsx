import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
} from "reactstrap";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiSave,
  FiPlus,
  FiTrash2,
  FiInfo,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import AsyncSelect from "react-select/async";
import { components } from "react-select";

const MySwal = withReactContent(Swal);

// Custom ClearIndicator for react-select
const ClearIndicator = (props) => {
  const {
    innerProps: { ref, ...rest },
  } = props;
  return (
    <div
      {...rest}
      ref={ref}
      style={{
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <FiX size={16} color="#6c757d" />
    </div>
  );
};

// Custom Option component for product display
const ProductOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props;
  const produit = data.data;

  let priceRangeInfo = "";
  if (produit.prix_vente_min && produit.prix_vente_max) {
    priceRangeInfo = ` | Fourchette: ${produit.prix_vente_min} - ${produit.prix_vente_max} DH`;
  } else if (produit.prix_vente_min) {
    priceRangeInfo = ` | Min: ${produit.prix_vente_min} DH`;
  } else if (produit.prix_vente_max) {
    priceRangeInfo = ` | Max: ${produit.prix_vente_max} DH`;
  }

  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`p-2 cursor-pointer ${isSelected ? "bg-primary text-white" : ""} ${isFocused && !isSelected ? "bg-light" : ""}`}
    >
      <div className="fw-bold">{data.label}</div>
      <div className={`small ${isSelected ? "text-white" : "text-muted"}`}>
        Stock: {produit.qty || 0} | Prix: {produit.prix_vente} DH{priceRangeInfo}
      </div>
      {produit.surface > 0 && (
        <div className={`small ${isSelected ? "text-white" : "text-muted"}`}>
          Surface: {produit.surface} m²
        </div>
      )}
    </div>
  );
};

// Devis status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé au client" },
  { value: "en_attente", label: "En Attente de réponse" },
  { value: "accepté", label: "Accepté par le client" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_facture", label: "Transformé en Facture" },
  { value: "transformé_bon_livraison", label: "Transformé en Bon Livraison" },
];

const DevisDetailsModal = ({ isOpen, toggle, devis, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    validUntil: null,
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    lignes: [],
  });

  console.log("Lignes: " + JSON.stringify(formData.lignes));

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProduits(true);
      try {
        const response = await axios.get(`${config_url}/api/produits`);
        const options = (response.data?.produits || []).map((produit) => ({
          value: produit.id,
          label: `${produit.reference} - ${produit.designation}`,
          data: {
            ...produit,
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
          },
        }));
        setProducts(options);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProduits(false);
      }
    };
    fetchProducts();
  }, []);

  // Load products for async select
  const loadProduits = async (inputValue) => {
    if (!inputValue) return products;

    const filtered = products.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const p = option.data;
      return (
        p.reference?.toLowerCase().includes(searchTerm) ||
        p.designation?.toLowerCase().includes(searchTerm)
      );
    });

    if (filtered.length === 0 && inputValue.length >= 2) {
      try {
        const res = await axios.get(
          `${config_url}/api/produits/search?q=${inputValue}`,
        );
        return (res.data.produits || []).map((p) => ({
          value: p.id,
          label: `${p.reference} - ${p.designation}`,
          data: {
            ...p,
            displayText: `${p.reference} - ${p.designation} (Stock: ${p.qty}, Prix: ${p.prix_vente} DH)`,
          },
        }));
      } catch (err) {
        console.error(err);
        return [];
      }
    }

    return filtered;
  };

  // Handle product selection for a ligne
  const handleProductSelect = (selectedOption, index) => {
    const updatedLignes = [...formData.lignes];
    
    if (!selectedOption) {
      // Clear product selection
      updatedLignes[index] = {
        ...updatedLignes[index],
        reference: "",
        articleName: "",
        produit_id: null,
        produit: null,
        prix_unitaire: 0,
        total_ligne: calculateItemTotal({
          ...updatedLignes[index],
          prix_unitaire: 0,
        }),
      };
    } else {
      const produit = selectedOption.data;
      updatedLignes[index] = {
        ...updatedLignes[index],
        reference: produit.reference,
        articleName: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        prix_unitaire: parseFloat(produit.prix_vente) || 0,
        total_ligne: calculateItemTotal({
          ...updatedLignes[index],
          prix_unitaire: parseFloat(produit.prix_vente) || 0,
        }),
      };
    }

    setFormData((prev) => ({
      ...prev,
      lignes: updatedLignes,
    }));
  };

  // Initialize form data when devis changes
  useEffect(() => {
    if (devis) {
      console.log("Initializing form with Devis:", devis);

      // Map lignes to items format expected by the UI
      const mappedLignes = devis.lignes
        ? devis.lignes.map((ligne, index) => ({
            id: ligne.id || `temp-${index}`,
            // Store product reference from the nested produit object
            reference: ligne.produit?.reference || "",
            // Use articleName from ligne (or fallback to produit designation)
            articleName: ligne.articleName || ligne.produit?.designation || "",
            quantite: parseFloat(ligne.quantite) || 1,
            v1: parseFloat(ligne.v1) || 1,
            v2: parseFloat(ligne.v2) || 1,
            v3: 1, // Default value since not in API
            prix_unitaire: parseFloat(ligne.prix_unitaire) || 0,
            total_ligne: parseFloat(ligne.total_ligne) || 0,
            produit_id: ligne.produit_id,
            devis_id: ligne.devis_id,
            // Store the full produit object for reference
            produit: ligne.produit || null,
          }))
        : [];

      setFormData({
        customerName: devis.customerName || "",
        customerPhone: devis.customerPhone || "",
        issueDate: devis.issueDate ? new Date(devis.issueDate) : new Date(),
        validUntil: devis.validUntil ? new Date(devis.validUntil) : null,
        notes: devis.notes || "",
        status: devis.status || "brouillon",
        discountType: devis.discountType || "fixed",
        discountValue: parseFloat(devis.discountValue) || 0,
        lignes: mappedLignes,
      });
    }
  }, [devis]);

  if (!devis) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "envoyé":
        return "info";
      case "accepté":
        return "success";
      case "refusé":
        return "danger";
      case "en_attente":
        return "primary";
      case "expiré":
        return "secondary";
      case "transformé_facture":
        return "dark";
      case "transformé_bon_livraison":
        return "info";
      default:
        return "secondary";
    }
  };

  // Calculate item total - matching your backend logic
  const calculateItemTotal = (ligne) => {
    // Backend formula: quantite * v1 * v2 * prix_unitaire
    return ligne.quantite * ligne.v1 * ligne.v2 * ligne.prix_unitaire;
  };

  // Calculate all totals
  const subTotal = formData.lignes.reduce(
    (sum, ligne) => sum + calculateItemTotal(ligne),
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    } else {
      return formData.discountValue;
    }
  };

  const discount = calculateDiscount();
  const total = Math.max(0, subTotal - discount);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Add new article line
  const handleAddLigne = () => {
    const newLigne = {
      id: `temp-${Date.now()}`,
      reference: "",
      articleName: "",
      quantite: 1,
      v1: 1,
      v2: 1,
      v3: 1,
      prix_unitaire: 0,
      total_ligne: 0,
      produit_id: null,
      produit: null,
    };
    setFormData((prev) => ({
      ...prev,
      lignes: [...prev.lignes, newLigne],
    }));
  };

  // Delete a ligne
  const handleDeleteLigne = async (index) => {
    const ligne = formData.lignes[index];
    
    if (ligne.id && !String(ligne.id).startsWith("temp-")) {
      const confirm = await MySwal.fire({
        title: "Supprimer cet article?",
        text: "Êtes-vous sûr de vouloir supprimer cet article du devis?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Oui, supprimer",
        cancelButtonText: "Annuler",
      });

      if (!confirm.isConfirmed) return;
    }

    const updatedLignes = formData.lignes.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      lignes: updatedLignes,
    }));
  };

  const handleLigneChange = (index, field, value) => {
    const updatedLignes = [...formData.lignes];
    updatedLignes[index] = {
      ...updatedLignes[index],
      [field]: field === "articleName" ? value : parseFloat(value) || 0,
    };

    // Recalculate total price when dimensions change
    if (["quantite", "v1", "v2", "prix_unitaire"].includes(field)) {
      updatedLignes[index].total_ligne = calculateItemTotal(
        updatedLignes[index],
      );
    }

    setFormData((prev) => ({
      ...prev,
      lignes: updatedLignes,
    }));
  };

  const handleSubmit = async () => {
    console.log("Current form data before submit:", formData);

    // Validate customer name
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    // Validate items
    if (!formData.lignes || formData.lignes.length === 0) {
      topTost("Le devis doit avoir au moins un article", "error");
      return;
    }

    // Validate each item has required fields
    for (const ligne of formData.lignes) {
      if (!ligne.articleName || !ligne.articleName.trim()) {
        topTost("Tous les articles doivent avoir un nom", "error");
        return;
      }
      if (ligne.quantite <= 0 || ligne.prix_unitaire < 0) {
        topTost("Quantité doit être positive et prix unitaire valide", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for backend - match the API structure
      const updateData = {
        devisNumber: devis.devisNumber,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        issueDate: formData.issueDate.toISOString().split("T")[0],
        validUntil: formData.validUntil
          ? formData.validUntil.toISOString().split("T")[0]
          : null,
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: formData.discountValue.toString(),
        subTotal: subTotal.toString(),
        total: total.toString(),
        lignes: formData.lignes.map((ligne) => ({
          id: ligne.id?.toString().startsWith("temp-") ? undefined : ligne.id,
          articleName: ligne.articleName.trim(),
          quantite: ligne.quantite.toString(),
          v1: ligne.v1.toString(),
          v2: ligne.v2.toString(),
          prix_unitaire: ligne.prix_unitaire.toString(),
          total_ligne: ligne.total_ligne.toString(),
          produit_id: ligne.produit_id,
        })),
      };

      console.log("Sending update data to backend:", updateData);

      const response = await axios.put(
        `${config_url}/api/devis/${devis.id}`,
        updateData,
      );

      console.log("Update response from backend:", response.data);

      topTost("Devis mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating devis:", error);
      console.error("Error response data:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Erreur lors de la mise à jour du devis. Veuillez réessayer.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === "transformé_facture" && !devis.convertedToInvoice) {
      // Check if devis is accepted before converting
      if (devis.status !== "accepté") {
        const confirmConvert = await MySwal.fire({
          title: "Convertir en Facture?",
          text: "Seuls les devis acceptés peuvent être transformés en facture. Voulez-vous continuer?",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Oui, convertir!",
          cancelButtonText: "Annuler",
        });

        if (!confirmConvert.isConfirmed) {
          setFormData((prev) => ({ ...prev, status: devis.status }));
          return;
        }
      }

      // Convert to invoice immediately
      await convertToInvoice();
    } else if (newStatus === "transformé_bon_livraison" && !devis.convertedToBonLivraison) {
      // Check if devis is accepted before converting
      if (devis.status !== "accepté") {
        const confirmConvert = await MySwal.fire({
          title: "Convertir en Bon Livraison?",
          text: "Seuls les devis acceptés peuvent être transformés en bon de livraison. Voulez-vous continuer?",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Oui, convertir!",
          cancelButtonText: "Annuler",
        });

        if (!confirmConvert.isConfirmed) {
          setFormData((prev) => ({ ...prev, status: devis.status }));
          return;
        }
      }

      // Convert to bon livraison immediately
      await convertToBonLivraison();
    } else {
      // For other status changes, just update the form
      handleInputChange("status", newStatus);
    }
  };

  const convertToInvoice = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${config_url}/api/devis/${devis.id}/convert-to-invoice`,
      );

      topTost("Devis converti en facture avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis);
      }

      toggle();
    } catch (error) {
      console.error("Error converting devis to invoice:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la conversion en facture";
      topTost(errorMessage, "error");

      // Reset status on error
      setFormData((prev) => ({ ...prev, status: devis.status }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertToBonLivraison = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${config_url}/api/devis/${devis.id}/convert-to-bon-livraison`,
      );

      topTost("Devis converti en bon de livraison avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis);
      }

      toggle();
    } catch (error) {
      console.error("Error converting devis to bon livraison:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la conversion en bon de livraison";
      topTost(errorMessage, "error");

      setFormData((prev) => ({ ...prev, status: devis.status }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!devis) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    const printWindow = window.open("", "_blank");
    printWindow.document.title = "";
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title></title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .company-info, .devis-info {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .info-block {
      flex: 1;
      min-width: 220px;
    }
    .info-block p {
      margin: 3px 0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      table-layout: fixed;
    }
    .table th, .table td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: left;
      word-wrap: break-word;
      white-space: normal;
      vertical-align: top;
    }
    .table th {
      background-color: #f5f5f5;
    }
    .table td:first-child {
      width: 30%;
    }
    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 20px;
    }
    .totals p {
      margin: 2px 0;
    }
    .notes {
      margin-top: 20px;
    }
 .footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid #333;
  padding-top: 10px;
  text-align: center;
  font-size: 9px;
  color: #444;
  background: white;
}
    @page {
      margin: 0;
      size: A4;
    }
    body {
      margin: 15mm;
    }
    @media print {
      body { margin: 15mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">DEVIS</h2>
 
  </div>

  <div class="company-info">
    <div class="info-block">
      <p><strong>Sté RachidGlass S.A.R.L A.U</strong></p>
      <p>VENTE TOUS TYPE DE VERRE — Import / Export</p>
      <p>Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</p>
      <p>Email: ibaghatrachid83@gmail.com</p>
      <p>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</p>
      <p>ICE: 003013206000054</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>Devis N°:</strong> ${devis.devisNumber}</p>
      <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
    </div>
  </div>

  <div class="devis-info">
    <div class="info-block">
      <p><strong>Client:</strong> ${formData.customerName}</p>
      <p><strong>Téléphone:</strong> ${formData.customerPhone || "Non spécifié"}</p>
    </div>
  </div>

  <table class="table">
 
<thead>
  <tr>
    <th>Réf</th>
    <th>Désignation</th>
    <th>Qté</th>
    <th>Long.</th>
    <th>Larg.</th>
    <th>Prix U.</th>
    <th>Total</th>
  </tr>
</thead>
<tbody>
  ${formData.lignes
    .map(
      (ligne) => `
    <tr>
      <td>${ligne.reference || ligne.produit?.reference || "—"}</td>
      <td>${ligne.articleName}</td>
      <td>${parseFloat(ligne.quantite).toFixed(2)}</td>
      <td>${parseFloat(ligne.v1).toFixed(2)}</td>
      <td>${parseFloat(ligne.v2).toFixed(2)}</td>
      <td>${parseFloat(ligne.prix_unitaire).toFixed(2)} Dh</td>
      <td>${parseFloat(ligne.total_ligne).toFixed(2)} Dh</td>
    </tr>
  `,
    )
    .join("")}
</tbody>
  </table>

  <div class="totals">
    <p><strong>Sous-total:</strong> ${subTotal.toFixed(2)} Dh</p>
    ${discount > 0 ? `<p><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>` : ""}
    <p><strong>Total:</strong> ${total.toFixed(2)} Dh</p>
  </div>

  <div class="footer">
    <p>
      <strong>Siège Social:</strong> Bni Boughamaren, Arimam Ihaddaden &nbsp;|&nbsp;
      <strong>Magasin:</strong> Hay Barraka Près de mosquée I Awaden
    </p>
    <p>
      ☎ 06.07.15.05.50 — 06.58.52.72.41 &nbsp;|&nbsp;
      📱 06.09.68.52.11 &nbsp;|&nbsp;
      Email: ibaghatrachid83@gmail.com
    </p>
    <p>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747 — ICE: 003013206000054</p>
   
  </div>

</body>
</html>
`;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateAndDownloadPDF = async () => {
    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.id = "pdf-container";
      pdfContainer.style.width = "210mm";
      pdfContainer.style.minHeight = "157mm";
      pdfContainer.style.padding = "15mm 20mm";
      pdfContainer.style.background = "white";
      pdfContainer.style.color = "#000";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "11px";
      pdfContainer.style.lineHeight = "1.5";
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";

      const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("fr-FR");
      };

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">DEVIS</h1>
        <h3 style="margin:5px 0;">STE. RACHIGLASS S.A.R.L. A.U</h3>
        <p style="margin:2px 0;">VENTE TOUS TYPE DE VERRE — Import / Export</p>
        <p style="font-size:10px; margin:2px 0;">Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <p style="margin:2px 0;"><strong>Sté RachidGlass S.A.R.L A.U</strong></p>
          <p style="margin:2px 0;">VENTE TOUS TYPE DE VERRE — Import / Export</p>
          <p style="margin:2px 0;">Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</p>
          <p style="margin:2px 0;">Email: ibaghatrachid83@gmail.com</p>
          <p style="margin:2px 0;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</p>
          <p style="margin:2px 0;">ICE: 003013206000054</p>
        </div>
        <div style="text-align:right;">
          <h4 style="margin-bottom:5px;">Devis</h4>
          <p style="margin:2px 0;"><strong>N°:</strong> ${devis.devisNumber}</p>
          <p style="margin:2px 0;"><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
          <p style="margin:2px 0;"><strong>Statut:</strong> ${
            statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status
          }</p>
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <h4 style="margin-bottom:5px;">Client</h4>
        <p style="margin:2px 0;"><strong>Nom:</strong> ${formData.customerName}</p>
        <p style="margin:2px 0;"><strong>Téléphone:</strong> ${formData.customerPhone || "Non spécifié"}</p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
      <thead>
  <tr style="background-color:#2c5aa0; color:#fff;">
    <th style="padding:6px; border:1px solid #2c5aa0;">RÉF</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">DÉSIGNATION</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">QTÉ</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">LONG.</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">LARG.</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">P.U</th>
    <th style="padding:6px; border:1px solid #2c5aa0;">TOTAL</th>
  </tr>
</thead>
<tbody>
  ${formData.lignes
    .map(
      (ligne, i) => `
      <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
        <td style="border:1px solid #ddd; padding:5px;">${ligne.reference || ligne.produit?.reference || "—"}</td>
        <td style="border:1px solid #ddd; padding:5px;">${ligne.articleName}</td>
        <td style="border:1px solid #ddd; text-align:center; padding:5px;">${ligne.quantite}</td>
        <td style="border:1px solid #ddd; text-align:center; padding:5px;">${ligne.v1}</td>
        <td style="border:1px solid #ddd; text-align:center; padding:5px;">${ligne.v2}</td>
        <td style="border:1px solid #ddd; text-align:right; padding:5px;">${ligne.prix_unitaire.toFixed(2)} Dh</td>
        <td style="border:1px solid #ddd; text-align:right; padding:5px;">${ligne.total_ligne.toFixed(2)} Dh</td>
      </tr>`,
    )
    .join("")}
</tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p style="margin:2px 0;"><strong>Sous-total:</strong> ${subTotal.toFixed(2)} Dh</p>
        ${discount > 0 ? `<p style="margin:2px 0;"><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>` : ""}
        <p style="font-size:13px; font-weight:bold; color:#2c5aa0; border-top:2px solid #2c5aa0; padding-top:5px;">
          Total: ${total.toFixed(2)} Dh
        </p>
      </div>

     <div style="
  position: absolute;
  bottom: 15mm;
  left: 20mm;
  right: 20mm;
  border-top: 2px solid #333;
  padding-top: 10px;
  text-align: center;
  font-size: 9px;
  color: #444;
">
  <p style="margin:3px 0;">
    <strong>Siège Social:</strong> Bni Boughamaren, Arimam Ihaddaden &nbsp;|&nbsp;
    <strong>Magasin:</strong> Hay Barraka Près de mosquée I Awaden
  </p>
        <p style="margin:3px 0;">
          ☎ 06.07.15.05.50 — 06.58.52.72.41 &nbsp;|&nbsp;
          📱 06.09.68.52.11 &nbsp;|&nbsp;
          Email: ibaghatrachid83@gmail.com
        </p>
        <p style="margin:3px 0;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747 — ICE: 003013206000054</p>
      
      </div>
    `;

      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 1) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Devis-${devis.devisNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };
  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        Devis #{devis.devisNumber}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
      </ModalHeader>

      <ModalBody style={{ overflow: "visible" }}>
        <div className="row">
          {/* Customer Information */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Nom Client *</label>
              <input
                type="text"
                className="form-control"
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                required
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">
                Téléphone Client
                {["envoyé", "en_attente"].includes(formData.status) && (
                  <span className="text-danger"> *</span>
                )}
              </label>
              <input
                type="tel"
                className="form-control"
                value={formData.customerPhone}
                onChange={(e) =>
                  handleInputChange("customerPhone", e.target.value)
                }
                placeholder="06 XX XX XX XX ou +212 6 XX XX XX XX"
                required={["envoyé", "en_attente"].includes(formData.status)}
              />
            </div>
          </div>

          {/* Devis Details */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Date du Devis</label>
              <DatePicker
                selected={formData.issueDate}
                onChange={(date) => handleInputChange("issueDate", date)}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isSubmitting || (devis.convertedToInvoice && devis.convertedToBonLivraison)}
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      (option.value === "transformé_facture" &&
                        devis.convertedToInvoice) ||
                      (option.value === "transformé_bon_livraison" &&
                        devis.convertedToBonLivraison)
                    }
                  >
                    {option.label}
                    {option.value === "transformé_facture" &&
                    devis.convertedToInvoice
                      ? " (Déjà converti)"
                      : option.value === "transformé_bon_livraison" &&
                        devis.convertedToBonLivraison
                      ? " (Déjà converti)"
                      : ""}
                  </option>
                ))}
              </select>
              {devis.convertedToInvoice && (
                <small className="text-success d-block">
                  ✓ Ce devis a été converti en facture #
                  {devis.convertedInvoiceId}
                </small>
              )}
              {devis.convertedToBonLivraison && (
                <small className="text-info d-block">
                  ✓ Ce devis a été converti en bon de livraison #
                  {devis.convertedBonLivraisonId}
                </small>
              )}
            </div>
          </div>

          {/* Discount Section */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Type de Remise</label>
              <select
                className="form-control"
                value={formData.discountType}
                onChange={(e) =>
                  handleInputChange("discountType", e.target.value)
                }
              >
                <option value="fixed">Montant Fixe (Dh)</option>
                <option value="percentage">Pourcentage (%)</option>
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">
                {formData.discountType === "percentage"
                  ? "Remise (%)"
                  : "Remise (Dh)"}
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.discountValue}
                onChange={(e) =>
                  handleInputChange(
                    "discountValue",
                    parseFloat(e.target.value) || 0,
                  )
                }
                min="0"
                max={formData.discountType === "percentage" ? 100 : subTotal}
                step={formData.discountType === "percentage" ? 1 : 0.01}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes / Description</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Description des travaux, conditions particulières, validité..."
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Articles / Prestations</h6>
              {!devis.convertedToInvoice && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleAddLigne}
                >
                  <FiPlus className="me-1" />
                  Ajouter un article
                </button>
              )}
            </div>
            <div className="table-responsive" style={{ overflow: "visible" }}>
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Code/Réf</th>
                    <th>Désignation</th>
                    <th>Qté</th>
                    <th>Longueur</th>
                    <th>Largeur</th>
                    <th>Prix/Unité</th>
                    <th>Total</th>
                    {!devis.convertedToInvoice && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.lignes.map((ligne, index) => (
                    <tr key={ligne.id || index}>
                      {/* Code/Référence - Static display from produit */}
                      <td className="align-middle">
                        <span className="fw-bold text-primary">
                          {ligne.reference || ligne.produit?.reference || "—"}
                        </span>
                      </td>

                      {/* Désignation - Product Select */}
                      <td>
                        {loadingProduits ? (
                          <div className="text-center py-2 text-muted">
                            Chargement...
                          </div>
                        ) : (
                          <>
                            <AsyncSelect
                              cacheOptions
                              loadOptions={loadProduits}
                              defaultOptions={true}
                              value={
                                ligne.produit_id
                                  ? {
                                      value: ligne.produit_id,
                                      label: ligne.articleName || `${ligne.reference || ""} - ${ligne.articleName || ""}`,
                                      data: ligne.produit || {
                                        reference: ligne.reference,
                                        designation: ligne.articleName,
                                        qty: 0,
                                        prix_vente: ligne.prix_unitaire,
                                      },
                                    }
                                  : null
                              }
                              onChange={(opt) => handleProductSelect(opt, index)}
                              placeholder="Rechercher produit..."
                              isClearable
                              isLoading={loadingProduits}
                              components={{
                                Option: ProductOption,
                                ClearIndicator,
                              }}
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: "38px",
                                  zIndex: 1,
                                }),
                                menu: (base) => ({ 
                                  ...base, 
                                  zIndex: 1050,
                                }),
                              }}
                            />
                            {ligne.produit && (
                              <small className="text-muted d-block mt-1">
                                Stock: {ligne.produit.qty || 0} | Prix: {ligne.prix_unitaire?.toFixed(2) || "0.00"} DH
                              </small>
                            )}
                          </>
                        )}
                      </td>

                      {/* Quantity - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={ligne.quantite}
                          onChange={(e) =>
                            handleLigneChange(index, "quantite", e.target.value)
                          }
                          min="1"
                          step="1"
                        />
                      </td>

                      {/* Longueur (v1) - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={ligne.v1}
                          onChange={(e) =>
                            handleLigneChange(index, "v1", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>

                      {/* Largeur (v2) - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={ligne.v2}
                          onChange={(e) =>
                            handleLigneChange(index, "v2", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>

                      {/* Prix/Unité - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={ligne.prix_unitaire}
                          onChange={(e) =>
                            handleLigneChange(
                              index,
                              "prix_unitaire",
                              e.target.value,
                            )
                          }
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Total - Static display (calculated) */}
                      <td className="align-middle text-end">
                        <span className="fw-bold text-success">
                          {ligne.total_ligne?.toFixed(2) || "0.00"} Dh
                        </span>
                      </td>

                      {/* Delete button */}
                      {!devis.convertedToInvoice && (
                        <td className="align-middle text-center">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteLigne(index)}
                            title="Supprimer"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="col-12">
            <div className="bg-light p-3 rounded mt-3">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé du Devis</h6>
                  <p>
                    <strong>Client:</strong> {formData.customerName}
                  </p>
                  <p>
                    <strong>Téléphone:</strong>{" "}
                    {formData.customerPhone || "Non spécifié"}
                  </p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    {
                      statusOptions.find((opt) => opt.value === formData.status)
                        ?.label
                    }
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Sous-total:</span>
                    <span>{subTotal.toFixed(2)} Dh</span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise:</span>
                      <span>-{discount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total:</span>
                    <span>{total.toFixed(2)} Dh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          className="btn btn-outline-primary"
          onClick={generateAndDownloadPDF}
        >
          <FiDownload className="me-2" />
          Télécharger PDF
        </button>
        <Button onClick={handlePrint} color="outline-primary">
          <FiPrinter className="me-2" />
          Imprimer
        </Button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting || devis.convertedToInvoice}
        >
          <FiSave className="me-2" />
          {isSubmitting
            ? "Enregistrement..."
            : devis.convertedToInvoice
              ? "Lecture seule"
              : "Enregistrer les modifications"}
        </button>
        <button className="btn btn-secondary" onClick={toggle}>
          <FiX className="me-2" />
          Fermer
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default DevisDetailsModal;
