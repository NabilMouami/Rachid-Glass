import React, { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import Select from "react-select";
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

// ─── Invoice HTML Template ──────────────────────────────────────────────────
// Shared template used by both Print and PDF generation
const buildInvoiceHTML = ({
  invoice,
  formData,
  subTotal,
  discount,
  totalHT,
  tvaAmount,
  totalTTC,
  totalAdvancement,
  remainingAmount,
}) => {
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

  const itemsRows = formData.items
    .map(
      (item, i) => `
      <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="td-center">${parseFloat(item.quantity || 0).toFixed(2)}</td>
        <td>${item.produit?.designation || item.designation || "-"}</td>
        <td class="td-right">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
        ${item.remise_ligne > 0 ? `<td class="td-right">${parseFloat(item.remise_ligne).toFixed(2)}</td>` : `<td class="td-center td-muted">—</td>`}
        <td class="td-right td-bold">${parseFloat(item.totalPrice || 0).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("");

  const advancementsSection =
    formData.advancements && formData.advancements.length > 0
      ? `
      <div class="section-block">
        <div class="section-title">Historique des Acomptes</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant (Dh)</th>
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
                <td class="td-right td-bold">${parseFloat(a.amount).toFixed(2)} Dh</td>
                <td>${a.paymentMethod || "—"}</td>
                <td>${a.reference || "—"}</td>
                <td>${a.notes || "—"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10.5px;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
      margin: 0;
    }

    /* ── Page wrapper ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm 30mm 14mm;
      position: relative;
      background: #fff;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 3px solid #1a3a6e;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #1a3a6e 0%, #2c5aa0 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-box span {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      letter-spacing: -1px;
    }
    .company-name {
      font-size: 17px;
      font-weight: 800;
      color: #1a3a6e;
      letter-spacing: 0.3px;
    }
    .company-sub {
      font-size: 9.5px;
      color: #4a6fa5;
      margin-top: 2px;
      font-weight: 500;
    }
    .company-arabic {
      font-size: 9px;
      color: #6b7a99;
      margin-top: 2px;
      direction: rtl;
    }
    .header-right {
      text-align: right;
    }
    .invoice-badge {
      display: inline-block;
      background: linear-gradient(135deg, #1a3a6e, #2c5aa0);
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      padding: 5px 16px;
      border-radius: 6px;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .invoice-num {
      font-size: 13px;
      font-weight: 700;
      color: #1a3a6e;
    }
    .invoice-date {
      font-size: 9.5px;
      color: #6b7a99;
      margin-top: 3px;
    }

    /* ── Info Band ── */
    .info-band {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-card {
      flex: 1;
      background: #f4f7fb;
      border: 1px solid #dbe4f0;
      border-radius: 7px;
      padding: 8px 12px;
    }
    .info-card-title {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #2c5aa0;
      margin-bottom: 4px;
      border-bottom: 1px solid #dbe4f0;
      padding-bottom: 3px;
    }
    .info-card p {
      margin: 2px 0;
      font-size: 9.5px;
      color: #2a2a3e;
    }
    .info-card p strong {
      color: #1a3a6e;
    }
    .info-card.highlight {
      background: linear-gradient(135deg, #eef3fb 0%, #dce8f8 100%);
      border-color: #2c5aa0;
    }

    /* ── Items Table ── */
    .section-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2c5aa0;
      margin-bottom: 5px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 14px;
    }
    .data-table thead tr {
      background: linear-gradient(90deg, #1a3a6e 0%, #2c5aa0 100%);
      color: #fff;
    }
    .data-table thead th {
      padding: 7px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      letter-spacing: 0.4px;
    }
    .data-table thead th.th-center { text-align: center; }
    .data-table thead th.th-right { text-align: right; }

    .row-even { background: #fff; }
    .row-odd  { background: #f7f9fd; }
    .data-table tbody tr { border-bottom: 1px solid #e8edf5; }
    .data-table tbody td { padding: 6px 8px; vertical-align: middle; }

    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-bold   { font-weight: 700; }
    .td-muted  { color: #aaa; }

    /* ── Totals block ── */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }
    .totals-box {
      width: 200px;
      border: 1px solid #dbe4f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 9.5px;
      border-bottom: 1px solid #eef1f7;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.highlight {
      background: linear-gradient(90deg, #1a3a6e, #2c5aa0);
      color: #fff;
      font-weight: 700;
      font-size: 10.5px;
    }
    .totals-row.remaining {
      background: #fff8e1;
      font-weight: 700;
      font-size: 10px;
      color: #c0392b;
    }
    .totals-row.paid {
      background: #e8f5e9;
      color: #1b5e20;
      font-weight: 600;
    }
    .totals-row .lbl { color: inherit; }
    .totals-row .val { font-weight: 700; }

    /* ── Amount in words ── */
    .amount-words {
      background: #f4f7fb;
      border: 1px solid #dbe4f0;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 9.5px;
      margin-bottom: 10px;
    }
    .amount-words strong { color: #1a3a6e; }

    /* ── Section block ── */
    .section-block { margin-bottom: 14px; }
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2c5aa0;
      margin-bottom: 5px;
    }

    /* ── Notes ── */
    .notes-block {
      background: #fffbf0;
      border-left: 3px solid #f39c12;
      padding: 6px 10px;
      font-size: 9px;
      color: #555;
      border-radius: 0 5px 5px 0;
      margin-bottom: 12px;
    }

    /* ── Footer ── */
    .footer {
      position: absolute;
      bottom: 10mm;
      left: 14mm;
      right: 14mm;
      border-top: 2px solid #1a3a6e;
      padding-top: 7px;
    }
    .footer-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .footer-col { font-size: 8px; color: #4a5568; line-height: 1.6; }
    .footer-col strong { color: #1a3a6e; }
    .footer-divider {
      text-align: center;
      font-size: 7.5px;
      color: #8a9ab5;
      margin-top: 4px;
      border-top: 1px dashed #dbe4f0;
      padding-top: 4px;
    }

    /* ── Print media ── */
    @page { size: A4; margin: 0; }
    @media print {
      body { padding: 0; margin: 0; }
      .page { width: 100%; padding: 12mm 14mm 30mm 14mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div class="header">
    <div class="header-left">
      <div class="logo-box"><span>RI</span></div>
      <div>
        <div class="company-name">STE. RACHIGLASS S.A.R.L. A.U</div>
        <div class="company-sub">VENTE TOUS TYPE DE VERRE &nbsp;—&nbsp; Import / Export</div>
        <div class="company-arabic">بيع وتركيب الزجاج — تصدير واستيراد</div>
      </div>
    </div>
    <div class="header-right">
      <div class="invoice-badge">FACTURE</div>
      <div class="invoice-num">N° ${invoice.invoiceNumber}</div>
      <div class="invoice-date">Date : ${formatDateTime(formData.issueDate)}</div>
      <div class="invoice-date">TVA : ${formData.tvaRate}%</div>
    </div>
  </div>

  <!-- ═══ INFO BAND ═══ -->
  <div class="info-band">
    <!-- Supplier -->
    <div class="info-card">
      <div class="info-card-title">Fournisseur</div>
      <p><strong>Sté RachiGlass S.A.R.L A.U</strong></p>
      <p>Tél : +212 607-150550 / +212 658-527241 / +212 609-685211</p>
      <p>Email : ibaghatrachid83@gmail.com</p>
      <p>ICE : 003013206000054 &nbsp;|&nbsp; IF : 52433058</p>
      <p>TP : 56780736 &nbsp;|&nbsp; RC : 24001 &nbsp;|&nbsp; CNSS : 2973747</p>
    </div>
    <!-- Client -->
    <div class="info-card highlight">
      <div class="info-card-title">Client</div>
      <p><strong>${formData.customerName || "—"}</strong></p>
      ${formData.ice ? `<p>ICE : ${formData.ice}</p>` : ""}
      ${formData.ste ? `<p>Ste : ${formData.ste}</p>` : ""}
    </div>
    <!-- Invoice Meta -->
    <div class="info-card">
      <div class="info-card-title">Détails Facture</div>
      <p><strong>Statut :</strong> ${formData.status}</p>
      <p><strong>Paiement :</strong> ${formData.paymentType}</p>
      ${formData.bonLivraisonId ? `<p><strong>BL N° :</strong> ${formData.bonLivraisonId}</p>` : ""}
      ${formData.preparedBy ? `<p><strong>Préparé par :</strong> ${formData.preparedBy}</p>` : ""}
      ${formData.validatedBy ? `<p><strong>Validé par :</strong> ${formData.validatedBy}</p>` : ""}
    </div>
  </div>

  <!-- ═══ ITEMS TABLE ═══ -->
  <div class="section-label">Articles</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="th-center" style="width:60px">Qté</th>
        <th>Désignation</th>
        <th class="th-right" style="width:70px">Prix U. (Dh)</th>
        <th class="th-right" style="width:65px">Remise</th>
        <th class="th-right" style="width:80px">Total HT (Dh)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#aaa;">Aucun article</td></tr>`}
    </tbody>
  </table>

  <!-- ═══ TOTALS ═══ -->
  <div class="totals-wrapper">
    <div class="totals-box">
   
      ${
        discount > 0
          ? `<div class="totals-row" style="color:#c0392b;">
          <span class="lbl">Remise</span>
          <span class="val">- ${discount.toFixed(2)} Dh</span>
        </div>`
          : ""
      }
      <div class="totals-row">
        <span class="lbl">Total HT</span>
        <span class="val">${totalHT.toFixed(2)} Dh</span>
      </div>
      <div class="totals-row">
        <span class="lbl">TVA (${formData.tvaRate}%)</span>
        <span class="val">+ ${tvaAmount.toFixed(2)} Dh</span>
      </div>
      <div class="totals-row highlight">
        <span class="lbl">MT TTC</span>
        <span class="val">${totalTTC.toFixed(2)} Dh</span>
      </div>
      ${
        totalAdvancement > 0
          ? `<div class="totals-row paid">
          <span class="lbl">Acompte versé</span>
          <span class="val">- ${totalAdvancement.toFixed(2)} Dh</span>
        </div>`
          : ""
      }
      <div class="totals-row remaining">
        <span class="lbl">Reste à payer</span>
        <span class="val">${remainingAmount.toFixed(2)} Dh</span>
      </div>
    </div>
  </div>

  <!-- ═══ NOTES ═══ -->
  ${
    formData.notes
      ? `<div class="notes-block"><strong>Notes :</strong> ${formData.notes}</div>`
      : ""
  }

  <!-- ═══ ADVANCEMENTS ═══ -->
  ${advancementsSection}

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <div class="footer-inner">
      <div class="footer-col">
        <strong>Siège Social :</strong> Bni Boughamaren, Arimam Ihaddaden
      </div>
      <div class="footer-col" style="text-align:center;">
        ☎ 06.07.15.05.50 — 06.58.52.72.41 &nbsp;|&nbsp; 📱 06.09.68.52.11<br/>
        ✉ ibaghatrachid83@gmail.com
      </div>
      <div class="footer-col" style="text-align:right;">
        <strong>Magasin :</strong> Hay Barraka Près de mosquée I Awaden
      </div>
    </div>
    <div class="footer-divider">
      TP : 56780736 &nbsp;—&nbsp; RC : 24001 &nbsp;—&nbsp; IF : 52433058 &nbsp;—&nbsp; CNSS : 2973747 &nbsp;—&nbsp; ICE : 003013206000054
    </div>
  </div>

</div>
${
  /* Auto-print script injected only for the print window */
  ""
}
</body>
</html>
`;
};

// Function to round to next multiple of 3
const roundToNextMultipleOfThree = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) return 1;
  if (numValue % 3 === 0) return numValue;
  return Math.ceil(numValue / 3) * 3;
};

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
        Stock: {produit.qty || 0} | Prix: {produit.prix_vente} DH
        {priceRangeInfo}
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

const paymentTypeOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
  { value: "multiple", label: "Paiement Multiple" },
  { value: "non_paye", label: "Non Payé" },
];

const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

const tvaOptions = [
  { value: 0, label: "0% (Exonéré)" },
  { value: 7, label: "7% (Taux réduit)" },
  { value: 10, label: "10% (Taux intermédiaire)" },
  { value: 14, label: "14% (Taux normal)" },
  { value: 20, label: "20% (Taux standard)" },
];

// Total to French text function
const totalToFrenchText = (amount) => {
  if (amount === 0) return "Zéro dirham";

  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ];
  const teens = [
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ];

  const convertLessThanOneThousand = (num) => {
    if (num === 0) return "";
    let result = "";

    if (num >= 100) {
      const h = Math.floor(num / 100);
      result += h === 1 ? "cent" : units[h] + " cent";
      num %= 100;
      if (num === 0 && h > 1) result += "s";
      if (num > 0) result += " ";
    }

    if (num < 10) result += units[num];
    else if (num < 20) result += teens[num - 10];
    else {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) {
        result += "soixante" + (u === 1 ? " et onze" : "-" + teens[u]);
      } else if (t === 9) {
        result += "quatre-vingt" + "-" + teens[u];
      } else {
        result += tens[t];
        if (u === 1 && t !== 8) result += " et un";
        else if (u > 0) result += "-" + units[u];
        if (t === 8 && u === 0) result += "s";
      }
    }
    return result;
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return "zéro";
    let result = "";

    if (num >= 1000000000) {
      const b = Math.floor(num / 1000000000);
      result +=
        convertLessThanOneThousand(b) + " milliard" + (b > 1 ? "s" : "") + " ";
      num %= 1000000000;
    }
    if (num >= 1000000) {
      const m = Math.floor(num / 1000000);
      result +=
        convertLessThanOneThousand(m) + " million" + (m > 1 ? "s" : "") + " ";
      num %= 1000000;
    }
    if (num >= 1000) {
      const t = Math.floor(num / 1000);
      result +=
        (t === 1 ? "mille" : convertLessThanOneThousand(t) + " mille") + " ";
      num %= 1000;
    }
    if (num > 0) result += convertLessThanOneThousand(num);

    return result.trim();
  };

  const dirhams = Math.floor(amount);
  const centimes = Math.round((amount - dirhams) * 100);

  let text =
    convertNumberToWords(dirhams) + " dirham" + (dirhams > 1 ? "s" : "");
  if (centimes > 0) {
    text +=
      " et " +
      convertNumberToWords(centimes) +
      " centime" +
      (centimes > 1 ? "s" : "");
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const FactureDetailsModal = ({ isOpen, toggle, invoice, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    paymentType: "non_paye",
    tvaRate: 20,
    includeTvaInPrice: true,
    items: [],
    advancements: [],
    preparedBy: "",
    validatedBy: "",
    bonLivraisonId: null,
    ice: "",
    ste: "",
  });

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

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const response = await axios.get(`${config_url}/api/clients`);
        const clientOptions = (response.data?.clients || []).map((client) => {
          const refPart = client.reference ? `(${client.reference}) ` : "";
          return {
            value: client.id,
            label: `${refPart}${client.nom_complete}${client.telephone ? ` - ${client.telephone}` : ""}`,
            searchText: [
              client.nom_complete?.toLowerCase() || "",
              client.telephone?.toLowerCase() || "",
              client.reference?.toLowerCase() || "",
            ].join(" "),
            ...client,
          };
        });
        setClients(clientOptions);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Handle client selection
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find((c) => c.value == clientId);
    if (selectedClient) {
      handleInputChange("customerName", selectedClient.nom_complete || "");
      handleInputChange("customerPhone", selectedClient.telephone || "");
    }
  };

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
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleAddItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      produit: null,
      code: "",
      designation: "",
      quantity: 1,
      unitPrice: 0,
      remise_ligne: 0,
      totalPrice: 0,
      tva_ligne: null,
      produit_id: null,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleDeleteItem = async (index) => {
    const item = formData.items[index];
    if (item.id && !String(item.id).startsWith("temp-")) {
      const confirm = await MySwal.fire({
        title: "Supprimer cet article?",
        text: "Êtes-vous sûr de vouloir supprimer cet article de la facture?",
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
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  useEffect(() => {
    if (invoice) {
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
        tvaRate: parseFloat(invoice.tvaRate) || 20,
        includeTvaInPrice: invoice.includeTvaInPrice !== false,
        items: mappedItems,
        advancements: mappedAdvancements,
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

  const calculateItemTotal = (item) => {
    const baseTotal = item.quantity * item.unitPrice;
    const lineDiscount = item.remise_ligne || 0;
    return Math.max(0, baseTotal - lineDiscount);
  };

  const subTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const discount = calculateDiscount();
  const totalHT = Math.max(0, subTotal - discount);
  const tvaRate = parseFloat(formData.tvaRate) || 20;
  const tvaAmount = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + tvaAmount;
  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );
  const remainingAmount = Math.max(0, totalTTC - totalAdvancement);

  // Shared template params
  const templateParams = {
    invoice,
    formData,
    subTotal,
    discount,
    totalHT,
    tvaAmount,
    totalTTC,
    totalAdvancement,
    remainingAmount,
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "articleName" ? value : parseFloat(value) || 0,
    };
    if (["quantity", "unitPrice", "remise_ligne"].includes(field)) {
      updatedItems[index].totalPrice = calculateItemTotal(updatedItems[index]);
    }
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(),
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
      setFormData((prev) => ({ ...prev, advancements: updatedAdvancements }));
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
    setFormData((prev) => ({ ...prev, advancements: updatedAdvancements }));
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      topTost("La facture doit avoir au moins un article", "error");
      return;
    }
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
    if (totalAdvancement > totalTTC) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total TTC",
        "error",
      );
      return;
    }
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
        tvaRate: formData.tvaRate,
        tvaAmount: tvaAmount,
        includeTvaInPrice: formData.includeTvaInPrice,
        subTotal,
        discountAmount: discount,
        totalHT,
        totalTTC,
        advancement: totalAdvancement,
        remainingAmount,
        preparedBy: formData.preparedBy || "",
        validatedBy: formData.validatedBy || "",
        bonLivraisonId: formData.bonLivraisonId,
        ice: formData.ice || "",
        ste: formData.ste || "",
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
          id: adv.id > 1000000000 ? undefined : adv.id,
          amount: adv.amount,
          paymentDate: adv.paymentDate.toISOString(),
          paymentMethod: adv.paymentMethod,
          reference: adv.reference,
          notes: adv.notes,
        })),
      };

      const response = await axios.put(
        `${config_url}/api/factures/${invoice.id}`,
        updateData,
      );
      topTost("Facture mise à jour avec succès!", "success");
      if (onUpdate) onUpdate(response.data.facture || response.data);
      toggle();
    } catch (error) {
      console.error("Error updating invoice:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Erreur lors de la mise à jour de la facture.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── PRINT ────────────────────────────────────────────────────────────────
  const buildPrintHTML = ({ autoPrint = false } = {}) => {
    const creationDateFormatted = new Date(formData.issueDate).toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const formatAmount = (value) =>
      Number(value || 0).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${invoice.invoiceNumber}</title>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4; margin: 10mm; }

    * {
      box-sizing: border-box;
      text-transform: uppercase;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 0.65rem;
      color: #000;
      margin: 0;
      padding: 10mm;
      padding-bottom: 70px;
      background: #fff;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 1px;
    }


    .info {
    margin-top: 120px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      border: 1.5px solid #000;
      padding: 6px;
    }

    th {
      background: #f2f2f2;
      text-align: center;
    }

    .text-center { text-align: center; }
    .text-end { text-align: right; }

    .totals {
      margin-top: 25px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .net-box {
      display: flex;
      gap: 15px;
      font-weight: bold;
    }

    .net-box span {
      border: 2px solid #000;
      padding: 10px 18px;
      font-size: 0.7rem;
    }

    .italic {
      font-style: italic;
      font-weight: bold;
      font-size: 0.7rem;
      text-align: right;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 2px solid #000;
      padding: 8px 10mm;
      text-align: center;
      font-size: 8px;
      color: #444;
      background: white;
      text-transform: uppercase;
    }

    @media print {
      .no-print { display: none; }
    }
  </style>
</head>

<body>



  <div class="info">
    <div>
      <strong>Client :</strong><br/>
      ${formData.customerName}<br/>
    </div>
     <div style="text-align:right;">
      <strong>N° Facture :</strong> ${invoice.invoiceNumber}<br/>
      <strong>Date création :</strong> ${creationDateFormatted}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map(
          (item) => `
        <tr>
          <td>${item.code || "—"}</td>
          <td>${item.designation || "—"}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-end">${formatAmount(item.unitPrice)}</td>
          <td class="text-end">${formatAmount(item.totalPrice)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
    <div>Total HT : ${formatAmount(totalHT)} DH</div>
    <div>TVA (${formData.tvaRate || 20}%) :</div>
    <div class="net-box">
      <span>Net TTC à payer</span>
      <span>${formatAmount(totalTTC)} DH</span>
    </div>
    ${
      totalAdvancement > 0
        ? `
      <div>Avancements : -${formatAmount(totalAdvancement)} DH</div>
      <div>Reste à payer : ${formatAmount(remainingAmount)} DH</div>
    `
        : ""
    }
    <div class="italic">
      ${totalToFrenchText(totalTTC)}
    </div>
  </div>

  ${
    autoPrint
      ? `<script>
    window.onload = function () {
      window.print();
      setTimeout(() => window.close(), 100);
    };
  </script>`
      : ""
  }

</body>
</html>
`;
  };

  const handlePrint = () => {
    if (!invoice) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Veuillez autoriser les popups pour imprimer");
      return;
    }
    const content = buildPrintHTML({ autoPrint: true });

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generatePrintDesignPdfBlob = async () => {
    const html = buildPrintHTML({ autoPrint: false });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    await new Promise((r) => setTimeout(r, 400));

    const canvas = await html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
    });

    document.body.removeChild(iframe);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgHeightMm = (canvas.height * pageWidth) / canvas.width;

    if (imgHeightMm <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeightMm);
    } else {
      let heightLeft = imgHeightMm;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightMm);
      heightLeft -= pageHeight;
      while (heightLeft > 1) {
        position = heightLeft - imgHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightMm);
        heightLeft -= pageHeight;
      }
    }

    return pdf.output("blob");
  };

  const handleUploadInvoicePdf = async () => {
    if (!invoice?.id) return;
    setIsUploadingPdf(true);
    try {
      const blob = await generatePrintDesignPdfBlob();
      const filename = `Facture-${invoice.invoiceNumber}.pdf`;

      const fd = new FormData();
      fd.append("pdf", blob, filename);

      await axios.post(`${config_url}/api/factures/${invoice.id}/pdf`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      topTost("PDF uploadé avec succès!", "success");
    } catch (err) {
      console.error("Erreur upload PDF:", err);
      const msg =
        err.response?.data?.message || "Erreur lors de l'upload du PDF";
      topTost(msg, "error");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // ─── PDF DOWNLOAD ─────────────────────────────────────────────────────────
  const generateAndDownloadPDF = async () => {
    try {
      const html = buildPrintHTML({ autoPrint: false });

      // Create hidden iframe to render the HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "794px"; // ~210mm at 96dpi
      iframe.style.height = "1123px"; // ~297mm at 96dpi
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      await new Promise((resolve) => {
        iframe.onload = resolve;
        iframe.srcdoc = html;
      });

      // Small delay for fonts/layout
      await new Promise((r) => setTimeout(r, 400));

      const canvas = await html2canvas(iframe.contentDocument.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297

      const imgHeightMm = (canvas.height * pageWidth) / canvas.width;

      if (imgHeightMm <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeightMm);
      } else {
        let heightLeft = imgHeightMm;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightMm);
        heightLeft -= pageHeight;
        while (heightLeft > 1) {
          position = heightLeft - imgHeightMm;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeightMm);
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
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      size="xl"
      style={{ maxWidth: "90vw" }}
    >
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
          {/* Client Selection */}
          <div className="col-md-12">
            <div className="form-group mb-3">
              <label className="form-label">Sélectionner un Client</label>
              <Select
                options={clients}
                value={
                  selectedClientId
                    ? clients.find((c) => c.value == selectedClientId)
                    : null
                }
                onChange={(option) => handleClientSelect(option?.value || "")}
                placeholder="Choisissez un client..."
                isClearable
                isSearchable
                isLoading={loadingClients}
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#fff",
                    borderColor: "#ddd",
                  }),
                }}
              />
            </div>
          </div>

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

          {/* Advancements */}
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
                            placeholder="N° chèque..."
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
                    <th>Prix/Unité</th>
                    <th>Total HT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="align-middle">
                        <span className="fw-bold text-primary">
                          {item.produit?.reference || item.code || "-"}
                        </span>
                      </td>
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
                                      label:
                                        item.designation ||
                                        `${item.code || ""} - ${item.designation || ""}`,
                                      data: item.produit || {
                                        reference: item.code,
                                        designation: item.designation,
                                        qty: 0,
                                        prix_vente: item.unitPrice,
                                      },
                                    }
                                  : null
                              }
                              onChange={(opt) =>
                                handleProductSelect(opt, index)
                              }
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
                                menu: (base) => ({ ...base, zIndex: 1050 }),
                              }}
                            />
                            {item.produit && (
                              <small className="text-muted d-block mt-1">
                                Stock: {item.produit.qty || 0} | Prix:{" "}
                                {item.unitPrice?.toFixed(2) || "0.00"} DH
                              </small>
                            )}
                          </>
                        )}
                      </td>
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
                      <td className="align-middle text-end">
                        <span className="fw-bold text-success">
                          {item.totalPrice?.toFixed(2) || "0.00"} Dh
                        </span>
                      </td>
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

          {/* Summary */}
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

                  {discount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise:</span>
                      <span>-{discount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>Total HT:</span>
                    <span>{totalHT.toFixed(2)} Dh</span>
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
        <button
          className="btn btn-outline-success"
          onClick={handleUploadInvoicePdf}
          disabled={isUploadingPdf}
        >
          <FiSave className="me-2" />
          {isUploadingPdf ? "Upload..." : "Uploader PDF"}
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
