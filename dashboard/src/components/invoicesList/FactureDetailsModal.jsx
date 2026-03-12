import React, { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import { components } from "react-select";
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
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";

import withReactContent from "sweetalert2-react-content";
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

// Moroccan invoice status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
  { value: "en_attente", label: "En Attente" },
];

// Moroccan payment types
const paymentTypeOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
  { value: "multiple", label: "Paiement Multiple" },
  { value: "non_paye", label: "Non Payé" },
];

// Payment methods for advancements
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

// TVA options
const tvaOptions = [
  { value: 0, label: "0% (Exonéré)" },
  { value: 7, label: "7% (Taux réduit)" },
  { value: 10, label: "10% (Taux intermédiaire)" },
  { value: 14, label: "14% (Taux normal)" },
  { value: 20, label: "20% (Taux standard)" },
];

const FactureDetailsModal = ({ isOpen, toggle, invoice, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    paymentType: "non_paye",

    // TVA specific fields
    tvaRate: 20,
    includeTvaInPrice: true,

    items: [],
    advancements: [],

    // Additional fields
    preparedBy: "",
    validatedBy: "",
    bonLivraisonId: null,
    ice: "",
    ste: "",
  });

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

  // Handle product selection for an item
  const handleProductSelect = (selectedOption, index) => {
    const updatedItems = [...formData.items];

    if (!selectedOption) {
      updatedItems[index] = {
        ...updatedItems[index],
        code: "",
        designation: "",
        produit_id: null,
        produit: null,
        unitPrice: 0,
        totalPrice: calculateItemTotal({
          ...updatedItems[index],
          unitPrice: 0,
        }),
      };
    } else {
      const produit = selectedOption.data;
      updatedItems[index] = {
        ...updatedItems[index],
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: parseFloat(produit.prix_vente) || 0,
        totalPrice: calculateItemTotal({
          ...updatedItems[index],
          unitPrice: parseFloat(produit.prix_vente) || 0,
        }),
      };
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  // Add new item
  const handleAddItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      produit: null,
      code: "",
      designation: "",
      quantity: 1,
      v1: 1,
      v2: 1,
      unitPrice: 0,
      remise_ligne: 0,
      totalPrice: 0,
      tva_ligne: null,
      produit_id: null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Delete an item
  const handleDeleteItem = async (index) => {
    const item = formData.items[index];

    if (item.id && !String(item.id).startsWith("temp-")) {
      const confirm = await MySwal.fire({
        title: "Supprimer cet article?",
        text: "\u00cates-vous s\u00fbr de vouloir supprimer cet article de la facture?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Oui, supprimer",
        cancelButtonText: "Annuler",
      });

      if (!confirm.isConfirmed) return;
    }

    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  console.log("Items: " + JSON.stringify(formData));

  // Initialize form data when invoice changes
  useEffect(() => {
    if (invoice) {
      console.log("Initializing form with Facture:", invoice);

      // Map lignes to items format expected by the UI
      const mappedItems = invoice.lignes
        ? invoice.lignes.map((ligne, index) => ({
            id: ligne.id || `temp-${index}`,
            code: ligne.produit?.reference || "",
            designation: ligne.produit?.designation || "",
            quantity: parseFloat(ligne.quantite) || 0,
            v1: parseFloat(ligne.v1) || 1,
            v2: parseFloat(ligne.v2) || 1,
            unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            remise_ligne: parseFloat(ligne.remise_ligne) || 0,
            totalPrice: parseFloat(ligne.total_ligne) || 0,
            tva_ligne: ligne.tva_ligne ? parseFloat(ligne.tva_ligne) : null,
            produit_id: ligne.produit_id,
            facture_id: ligne.facture_id,
            produit: ligne.produit,
          }))
        : [];

      // Map advancements from API
      const mappedAdvancements = invoice.advancements
        ? invoice.advancements.map((adv) => ({
            id: adv.id,
            amount: parseFloat(adv.amount) || 0,
            paymentDate: adv.paymentDate
              ? new Date(adv.paymentDate)
              : new Date(),
            paymentMethod: adv.paymentMethod || "espece",
            reference: adv.reference || "",
            notes: adv.notes || "",
          }))
        : [];

      setFormData({
        customerName:
          invoice.customerName || invoice.client?.nom_complete || "",
        customerPhone: invoice.customerPhone || invoice.client?.telephone || "",
        issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
        notes: invoice.notes || "",
        status: invoice.status || "brouillon",
        discountType: invoice.discountType || "fixed",
        discountValue: parseFloat(invoice.discountValue) || 0,
        paymentType: invoice.paymentType || "non_paye",

        // TVA fields
        tvaRate: parseFloat(invoice.tvaRate) || 20,
        includeTvaInPrice: invoice.includeTvaInPrice !== false,

        items: mappedItems,
        advancements: mappedAdvancements,

        // Additional fields
        preparedBy: invoice.preparedBy || "",
        validatedBy: invoice.validatedBy || "",
        bonLivraisonId: invoice.bonLivraisonId || null,
        ice: invoice.ice || "",
        ste: invoice.ste || "",
      });
    }
  }, [invoice]);

  if (!invoice) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "payée":
        return "success";
      case "envoyée":
        return "info";
      case "en_retard":
        return "danger";
      case "partiellement_payée":
        return "primary";
      default:
        return "secondary";
    }
  };

  const getTvaBadgeColor = (rate) => {
    switch (rate) {
      case 0:
        return "secondary";
      case 7:
        return "info";
      case 10:
        return "primary";
      case 14:
        return "warning";
      case 20:
        return "success";
      default:
        return "secondary";
    }
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    const baseTotal = item.quantity * item.v1 * item.v2 * item.unitPrice;
    const lineDiscount = item.remise_ligne || 0;
    return Math.max(0, baseTotal - lineDiscount);
  };

  // Calculate all totals
  const subTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
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
  const totalAfterDiscountHT = Math.max(0, subTotal - discount);

  // TVA Calculation
  const tvaAmount = (totalAfterDiscountHT * formData.tvaRate) / 100;
  const totalTTC = formData.includeTvaInPrice
    ? totalAfterDiscountHT + tvaAmount
    : totalAfterDiscountHT;

  // Calculate total advancement from advancements array
  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  const remainingAmount = Math.max(0, totalTTC - totalAdvancement);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "articleName" ? value : parseFloat(value) || 0,
    };

    // Recalculate total price when dimensions change
    if (["quantity", "v1", "v2", "unitPrice", "remise_ligne"].includes(field)) {
      updatedItems[index].totalPrice = calculateItemTotal(updatedItems[index]);
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  // Advancement handlers
  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(), // Temporary ID for new advancements
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "espece",
      reference: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      advancements: [...prev.advancements, newAdvancement],
    }));
  };

  const removeAdvancement = async (index) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Cet Avancement</strong>?
        </p>
      ),
      text: "Êtes-vous sûr de vouloir supprimer cet avancement?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });
    if (result.isConfirmed) {
      const updatedAdvancements = formData.advancements.filter(
        (_, i) => i !== index,
      );
      setFormData((prev) => ({
        ...prev,
        advancements: updatedAdvancements,
      }));
    }
  };

  const handleAdvancementChange = (index, field, value) => {
    const updatedAdvancements = [...formData.advancements];
    updatedAdvancements[index] = {
      ...updatedAdvancements[index],
      [field]:
        field === "paymentDate"
          ? value
          : field === "paymentMethod" ||
              field === "reference" ||
              field === "notes"
            ? value
            : parseFloat(value) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      advancements: updatedAdvancements,
    }));
  };

  const handleSubmit = async () => {
    console.log("Current form data before submit:", formData);

    // Validate customer name
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    // Validate items - at least one item required
    if (!formData.items || formData.items.length === 0) {
      topTost("La facture doit avoir au moins un article", "error");
      return;
    }

    // Validate each item has required fields
    for (const item of formData.items) {
      if (!item.produit_id && !item.code) {
        topTost(
          "Tous les articles doivent avoir un produit sélectionné",
          "error",
        );
        return;
      }
      if (item.quantity <= 0 || item.unitPrice < 0) {
        topTost("Quantité doit être positive et prix unitaire valide", "error");
        return;
      }
    }

    // Validate advancements don't exceed total
    if (totalAdvancement > totalTTC) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total TTC",
        "error",
      );
      return;
    }

    // Validate individual advancements
    for (const adv of formData.advancements) {
      if (!adv.amount || adv.amount <= 0) {
        topTost("Tous les acomptes doivent avoir un montant positif", "error");
        return;
      }
      if (!adv.paymentDate) {
        topTost("Tous les acomptes doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for backend
      const updateData = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        issueDate: formData.issueDate.toISOString(),
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        paymentType: formData.paymentType,

        // TVA fields
        tvaRate: formData.tvaRate,
        tvaAmount: tvaAmount,
        includeTvaInPrice: formData.includeTvaInPrice,

        // Financials
        subTotal: subTotal,
        discountAmount: discount,
        totalHT: totalAfterDiscountHT,
        totalTTC: totalTTC,
        advancement: totalAdvancement,
        remainingAmount: remainingAmount,

        preparedBy: formData.preparedBy || "",
        validatedBy: formData.validatedBy || "",
        bonLivraisonId: formData.bonLivraisonId,
        ice: formData.ice || "",
        ste: formData.ste || "",

        // Map items back to lignes format for backend
        lignes: formData.items.map((item) => ({
          id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
          produit_id: item.produit_id,
          quantite: item.quantity,
          v1: item.v1,
          v2: item.v2,
          prix_unitaire: item.unitPrice,
          remise_ligne: item.remise_ligne || 0,
          total_ligne: item.totalPrice,
          tva_ligne: item.tva_ligne,
        })),

        advancements: formData.advancements.map((adv) => ({
          id: adv.id > 1000000000 ? undefined : adv.id, // Check if temp ID
          amount: adv.amount,
          paymentDate: adv.paymentDate.toISOString(),
          paymentMethod: adv.paymentMethod,
          reference: adv.reference,
          notes: adv.notes,
        })),
      };

      console.log("Sending update data to backend:", updateData);

      const response = await axios.put(
        `${config_url}/api/factures/${invoice.id}`,
        updateData,
      );

      console.log("Update response from backend:", response.data);

      topTost("Facture mise à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.facture || response.data);
      }

      toggle();
    } catch (error) {
      console.error("Error updating invoice:", error);
      console.error("Error response data:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Erreur lors de la mise à jour de la facture. Veuillez réessayer.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const printWindow = window.open("", "_blank");
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${invoice.invoiceNumber}</title>
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
    .company-info, .invoice-info {
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
    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 20px;
    }
    .totals p {
      margin: 2px 0;
    }
    .advancements {
      margin-top: 25px;
    }
    .advancements h3 {
      margin-bottom: 5px;
      font-size: 12px;
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
    .tva-badge {
      background-color: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
    }
@page {
  margin: 0;
  size: A4;
}

@media print {
  body { margin: 15mm; }
  .no-print { display: none; }
}
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">FACTURE</h2>
    <h3 style="margin: 5px 0;">STE. RACHIGLASS S.A.R.L. A.U</h3>
    <p>VENTE TOUS TYPE DE VERRE — Import / Export</p>
    <p>Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</p>
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
      <p><strong>Facture N°:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date création:</strong> ${formatDateTime(formData.issueDate)}</p>
      <p><strong>TVA:</strong> ${formData.tvaRate}%</p>
    </div>
  </div>

  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Client:</strong> ${formData.customerName}</p>
      <p><strong>Tél:</strong> ${formData.customerPhone || "-"}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Long.</th>
        <th>Larg.</th>
        <th>Prix U.</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map(
          (item) => `
        <tr>
          <td>${item.produit?.reference || item.code || "-"}</td>
          <td>${item.produit?.designation || item.designation || "-"}</td>
          <td>${parseFloat(item.quantity).toFixed(2)}</td>
          <td>${parseFloat(item.v1).toFixed(2)}</td>
          <td>${parseFloat(item.v2).toFixed(2)}</td>
          <td>${parseFloat(item.unitPrice).toFixed(2)} Dh</td>
          <td>${parseFloat(item.totalPrice).toFixed(2)} Dh</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Sous-total HT:</strong> ${subTotal.toFixed(2)} Dh</p>
    ${
      discount > 0
        ? `<p><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>`
        : ""
    }
    <p><strong>Total HT:</strong> ${totalAfterDiscountHT.toFixed(2)} Dh</p>
    <p><strong>TVA (${formData.tvaRate}%):</strong> +${tvaAmount.toFixed(2)} Dh</p>
    <p style="font-weight:bold; font-size:12px;"><strong>Total TTC:</strong> ${totalTTC.toFixed(2)} Dh</p>
    ${
      totalAdvancement > 0
        ? `<p><strong>Avancement:</strong> -${totalAdvancement.toFixed(2)} Dh</p>
           <p style="font-weight:bold; border-top:1px solid #333; padding-top:5px;">
             Reste à payer: ${remainingAmount.toFixed(2)} Dh
           </p>`
        : `<p style="font-weight:bold; border-top:1px solid #333; padding-top:5px;">
             Reste à payer: ${remainingAmount.toFixed(2)} Dh
           </p>`
    }
  </div>

  ${
    formData.advancements && formData.advancements.length > 0
      ? `
    <div class="advancements">
      <h3>Historique des Avancements</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Date Paiement</th>
            <th>Montant</th>
            <th>Méthode</th>
            <th>Référence</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${formData.advancements
            .map(
              (a) => `
            <tr>
              <td>${formatDate(a.paymentDate)}</td>
              <td>${parseFloat(a.amount).toFixed(2)} Dh</td>
              <td>${a.paymentMethod}</td>
              <td>${a.reference || "-"}</td>
              <td>${a.notes || "-"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
      : ""
  }

  ${formData.notes ? `<div class="notes"><strong>Notes:</strong> ${formData.notes}</div>` : ""}

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
      pdfContainer.style.minHeight = "297mm";
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

      const formatDateTime = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">FACTURE</h1>

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
          <h4 style="margin-bottom:5px;">Facture</h4>
          <p style="margin:2px 0;"><strong>N°:</strong> ${invoice.invoiceNumber}</p>
          <p style="margin:2px 0;"><strong>Date:</strong> ${formatDateTime(formData.issueDate)}</p>
          <p style="margin:2px 0;"><strong>TVA:</strong> ${formData.tvaRate}%</p>
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <h4 style="margin-bottom:5px;">Client</h4>
        <p style="margin:2px 0;"><strong>Nom:</strong> ${formData.customerName}</p>
        <p style="margin:2px 0;"><strong>Tél:</strong> ${formData.customerPhone || "-"}</p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Code</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Désignation</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qté</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">L</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">l</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">P.U</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map(
              (item, i) => `
              <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
                <td style="border:1px solid #ddd; padding:5px;">${item.produit?.reference || item.code || "-"}</td>
                <td style="border:1px solid #ddd; padding:5px;">${item.produit?.designation || item.designation || "-"}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.quantity}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.v1}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.v2}</td>
                <td style="border:1px solid #ddd; text-align:right; padding:5px;">${item.unitPrice.toFixed(2)} Dh</td>
                <td style="border:1px solid #ddd; text-align:right; padding:5px;">${item.totalPrice.toFixed(2)} Dh</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p style="margin:2px 0;"><strong>Sous-total HT:</strong> ${subTotal.toFixed(2)} Dh</p>
        ${discount > 0 ? `<p style="margin:2px 0;"><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>` : ""}
        <p style="margin:2px 0;"><strong>Total HT:</strong> ${totalAfterDiscountHT.toFixed(2)} Dh</p>
        <p style="margin:2px 0;"><strong>TVA (${formData.tvaRate}%):</strong> +${tvaAmount.toFixed(2)} Dh</p>
        <p style="font-size:13px; font-weight:bold; color:#2c5aa0; margin:2px 0;">
          <strong>Total TTC:</strong> ${totalTTC.toFixed(2)} Dh
        </p>
        ${
          totalAdvancement > 0
            ? `<p style="margin:2px 0;"><strong>Avancement:</strong> -${totalAdvancement.toFixed(2)} Dh</p>
               <p style="font-size:12px; font-weight:bold; border-top:2px solid #2c5aa0; padding-top:5px;">
                 Reste à payer: ${remainingAmount.toFixed(2)} Dh
               </p>`
            : `<p style="font-size:12px; font-weight:bold; border-top:2px solid #2c5aa0; padding-top:5px;">
                 Reste à payer: ${remainingAmount.toFixed(2)} Dh
               </p>`
        }
      </div>

      ${
        formData.advancements && formData.advancements.length > 0
          ? `
        <div style="margin-top:25px;">
          <h4 style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px;">Historique des Avancements</h4>
          <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:10px;">
            <thead>
              <tr style="background-color:#f5f5f5;">
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Date Paiement</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:right;">Montant</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Méthode</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Référence</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${formData.advancements
                .map(
                  (a) => `
                <tr>
                  <td style="border:1px solid #ddd; padding:4px;">${formatDate(a.paymentDate)}</td>
                  <td style="border:1px solid #ddd; padding:4px; text-align:right;">${parseFloat(a.amount).toFixed(2)} Dh</td>
                  <td style="border:1px solid #ddd; padding:4px;">${a.paymentMethod}</td>
                  <td style="border:1px solid #ddd; padding:4px;">${a.reference || "-"}</td>
                  <td style="border:1px solid #ddd; padding:4px;">${a.notes || "-"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      ${formData.notes ? `<div style="margin-top:15px;"><strong>Notes:</strong> ${formData.notes}</div>` : ""}

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

      pdf.save(`Facture-${invoice.invoiceNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        Facture #{invoice.invoiceNumber}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
        <Badge color={getTvaBadgeColor(formData.tvaRate)} className="ms-2">
          TVA {formData.tvaRate}%
        </Badge>
      </ModalHeader>

      <ModalBody>
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
              <label className="form-label">Téléphone Client</label>
              <input
                type="tel"
                className="form-control"
                value={formData.customerPhone}
                onChange={(e) =>
                  handleInputChange("customerPhone", e.target.value)
                }
                placeholder="+212 XXX-XXXXXX"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Date et Heure</label>
              <DatePicker
                selected={formData.issueDate}
                onChange={(date) => handleInputChange("issueDate", date)}
                className="form-control"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                timeCaption="Heure"
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Type de Paiement</label>
              <select
                className="form-control"
                value={formData.paymentType}
                onChange={(e) =>
                  handleInputChange("paymentType", e.target.value)
                }
              >
                {paymentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TVA Settings */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Taux de TVA</label>
              <select
                className="form-control"
                value={formData.tvaRate}
                onChange={(e) =>
                  handleInputChange("tvaRate", parseFloat(e.target.value))
                }
              >
                {tvaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Type de prix</label>
              <div className="d-flex gap-4 mt-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="includeTva"
                    id="ttc"
                    checked={formData.includeTvaInPrice}
                    onChange={() =>
                      handleInputChange("includeTvaInPrice", true)
                    }
                  />
                  <label className="form-check-label" htmlFor="ttc">
                    TTC
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="includeTva"
                    id="ht"
                    checked={!formData.includeTvaInPrice}
                    onChange={() =>
                      handleInputChange("includeTvaInPrice", false)
                    }
                  />
                  <label className="form-check-label" htmlFor="ht">
                    HT
                  </label>
                </div>
              </div>
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

          {/* Advancements Section */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Avances</h6>
              <Button color="primary" size="sm" onClick={addAdvancement}>
                <FiPlus className="me-1" />
                Ajouter Avance
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant (Dh)</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.advancements.map((advancement, index) => (
                      <tr key={advancement.id || index}>
                        <td>
                          <DatePicker
                            selected={advancement.paymentDate}
                            onChange={(date) =>
                              handleAdvancementChange(
                                index,
                                "paymentDate",
                                date,
                              )
                            }
                            className="form-control form-control-sm"
                            dateFormat="dd/MM/yyyy"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={advancement.amount}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={advancement.paymentMethod}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "paymentMethod",
                                e.target.value,
                              )
                            }
                          >
                            {paymentMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.reference}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "reference",
                                e.target.value,
                              )
                            }
                            placeholder="N° chèque, référence..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.notes}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "notes",
                                e.target.value,
                              )
                            }
                            placeholder="Notes..."
                          />
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeAdvancement(index)}
                          >
                            <FiTrash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                Aucun avancement enregistré. Cliquez sur "Ajouter Avance" pour
                en ajouter.
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Company Info - ICE & STE */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">ICE</label>
              <input
                type="text"
                className="form-control"
                value={formData.ice}
                onChange={(e) => handleInputChange("ice", e.target.value)}
                placeholder="ICE..."
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Ste</label>
              <input
                type="text"
                className="form-control"
                value={formData.ste}
                onChange={(e) => handleInputChange("ste", e.target.value)}
                placeholder="Ste..."
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Articles</h6>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleAddItem}
              >
                <FiPlus className="me-1" />
                Ajouter un article
              </button>
            </div>
            <div className="table-responsive" style={{ overflow: "visible" }}>
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Qty</th>
                    <th>Longueur</th>
                    <th>Largeur</th>
                    <th>Prix/Unité</th>
                    <th>Total HT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={item.id || index}>
                      {/* Code - Static display */}
                      <td className="align-middle">
                        <span className="fw-bold text-primary">
                          {item.produit?.reference || item.code || "-"}
                        </span>
                      </td>

                      {/* Designation - Product Select */}
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
                                item.produit_id
                                  ? {
                                      value: item.produit_id,
                                      label: item.designation || `${item.code || ""} - ${item.designation || ""}`,
                                      data: item.produit || {
                                        reference: item.code,
                                        designation: item.designation,
                                        qty: 0,
                                        prix_vente: item.unitPrice,
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
                            {item.produit && (
                              <small className="text-muted d-block mt-1">
                                Stock: {item.produit.qty || 0} | Prix: {item.unitPrice?.toFixed(2) || "0.00"} DH
                              </small>
                            )}
                          </>
                        )}
                      </td>

                      {/* Qty - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Longueur (v1) - Input */}
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.v1}
                          onChange={(e) =>
                            handleItemChange(index, "v1", e.target.value)
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
                          value={item.v2}
                          onChange={(e) =>
                            handleItemChange(index, "v2", e.target.value)
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
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", e.target.value)
                          }
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Total HT - Static display (calculated) */}
                      <td className="align-middle text-end">
                        <span className="fw-bold text-success">
                          {item.totalPrice?.toFixed(2) || "0.00"} Dh
                        </span>
                      </td>

                      {/* Delete button */}
                      <td className="align-middle text-center">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteItem(index)}
                          title="Supprimer cet article"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section with TVA */}
          <div className="col-12">
            <div className="bg-light p-3 rounded mt-3">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé de la Facture</h6>
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
                  <p>
                    <strong>Paiement:</strong>{" "}
                    {
                      paymentTypeOptions.find(
                        (opt) => opt.value === formData.paymentType,
                      )?.label
                    }
                  </p>
                  <p>
                    <strong>TVA:</strong> {formData.tvaRate}%
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Sous-total HT:</span>
                    <span>{subTotal.toFixed(2)} Dh</span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise:</span>
                      <span>-{discount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>Total HT:</span>
                    <span>{totalAfterDiscountHT.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>TVA ({formData.tvaRate}%):</span>
                    <span className="text-info">
                      +{tvaAmount.toFixed(2)} Dh
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total TTC:</span>
                    <span className="text-primary">
                      {totalTTC.toFixed(2)} Dh
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total Avancement(s):</span>
                    <span className="text-success">
                      {totalAdvancement.toFixed(2)} Dh
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Reste à payer:</span>
                    <span
                      className={
                        remainingAmount > 0 ? "text-danger" : "text-success"
                      }
                    >
                      {remainingAmount.toFixed(2)} Dh
                    </span>
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
          disabled={isSubmitting}
        >
          <FiSave className="me-2" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
        <button className="btn btn-secondary" onClick={toggle}>
          <FiX className="me-2" />
          Fermer
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default FactureDetailsModal;
