import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Spinner,
  Alert,
} from "reactstrap";
import {
  FiPrinter,
  FiDownload,
  FiUser,
  FiCalendar,
  FiArrowLeft,
  FiShoppingCart,
  FiPlus,
  FiTrash2,
  FiPercent,
  FiX,
} from "react-icons/fi";
import AsyncSelect from "react-select/async";
import { components } from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const FactureDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [facture, setFacture] = useState(null);
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
        totalPrice: 0,
      };
    } else {
      const produit = selectedOption.data;
      const unitPrice = parseFloat(produit.prix_vente) || 0;
      const item = updatedItems[index];
      updatedItems[index] = {
        ...item,
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: unitPrice,
        totalPrice: item.quantity * item.v1 * item.v2 * unitPrice,
      };
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  useEffect(() => {
    if (id) {
      fetchFactureDetails();
    }
  }, [id]);

  const fetchFactureDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config_url}/api/factures/${id}`);
      const data = res.data.facture;

      setFacture(data);

      // Map lignes to items format
      const mappedItems = data.lignes
        ? data.lignes.map((ligne, index) => ({
            id: ligne.id || `temp-${index}`,
            code: ligne.produit?.reference || "",
            designation: ligne.produit?.designation || "",
            quantity: parseFloat(ligne.quantite) || 0,
            v1: parseFloat(ligne.v1) || 1,
            v2: parseFloat(ligne.v2) || 1,
            unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            totalPrice: parseFloat(ligne.total_ligne) || 0,
            tva_ligne: ligne.tva_ligne ? parseFloat(ligne.tva_ligne) : null,
            produit_id: ligne.produit_id,
            produit: ligne.produit,
          }))
        : [];

      const mappedAdvancements = data.advancements
        ? data.advancements.map((adv) => ({
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
        customerName: data.customerName || data.client?.nom_complete || "",
        customerPhone: data.customerPhone || data.client?.telephone || "",
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        notes: data.notes || "",
        status: data.status || "brouillon",
        discountType: data.discountType || "fixed",
        discountValue: parseFloat(data.discountValue) || 0,
        paymentType: data.paymentType || "non_paye",

        // TVA fields
        tvaRate: parseFloat(data.tvaRate) || 20,
        includeTvaInPrice: data.includeTvaInPrice !== false,

        items: mappedItems,
        advancements: mappedAdvancements,
      });
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement facture", "error");
      navigate("/factures");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement de la facture...</div>
      </Container>
    );
  }

  if (!facture) {
    return (
      <Container className="py-5">
        <Alert color="danger">Facture introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/factures")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // Calculations
  const subTotal = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.v1 * item.v2 * item.unitPrice,
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const discount = calculateDiscount();
  const totalAfterDiscountHT = Math.max(0, subTotal - discount);

  // TVA Calculation
  const tvaAmount = (totalAfterDiscountHT * formData.tvaRate) / 100;
  const totalTTC = formData.includeTvaInPrice
    ? totalAfterDiscountHT + tvaAmount
    : totalAfterDiscountHT;

  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );
  const remainingAmount = Math.max(0, totalTTC - totalAdvancement);

  const getStatusColor = (s) => {
    switch (s) {
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
      case "annulée":
        return "dark";
      default:
        return "secondary";
    }
  };

  const formatDateWithTime = (dateInput) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateInput) => {
    if (!dateInput) return "—";
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: parseFloat(value) || 0,
    };

    // Recalculate total
    const item = updatedItems[index];
    updatedItems[index].totalPrice =
      item.quantity * item.v1 * item.v2 * item.unitPrice;

    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      code: "",
      designation: "",
      quantity: 1,
      v1: 1,
      v2: 1,
      unitPrice: 0,
      totalPrice: 0,
      tva_ligne: null,
      produit_id: null,
      produit: null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
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

  const removeAdvancement = (index) => {
    const updatedAdvancements = formData.advancements.filter(
      (_, i) => i !== index,
    );
    setFormData((prev) => ({ ...prev, advancements: updatedAdvancements }));
  };

  const handleAdvancementChange = (index, field, value) => {
    const updatedAdvancements = [...formData.advancements];
    updatedAdvancements[index] = {
      ...updatedAdvancements[index],
      [field]:
        field === "paymentDate"
          ? value
          : ["paymentMethod", "reference", "notes"].includes(field)
            ? value
            : parseFloat(value) || 0,
    };
    setFormData((prev) => ({ ...prev, advancements: updatedAdvancements }));
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture ${facture.invoiceNumber}</title>
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

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .info {
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

  <div class="header">
    <div>
      <h2>FACTURE</h2>
      <div style="font-weight:bold; margin-top:4px;">STE. RACHIGLASS S.A.R.L. A.U</div>
      <div>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</div>
      <div>Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</div>
      <div>Email: ibaghatrachid83@gmail.com</div>
      <div>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</div>
      <div>ICE: 003013206000054</div>
    </div>
    <div style="text-align:right;">
      <strong>N° Facture :</strong> ${facture.invoiceNumber}<br/>
      <strong>Date création :</strong> ${creationDateFormatted}
    </div>
  </div>

  <div class="info">
    <div>
      <strong>Client :</strong><br/>
      ${formData.customerName}<br/>
      ${formData.customerPhone ? `Tél: ${formData.customerPhone}` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Long.</th>
        <th>Larg.</th>
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
          <td class="text-center">${item.v1}</td>
          <td class="text-center">${item.v2}</td>
          <td class="text-end">${formatAmount(item.unitPrice)}</td>
          <td class="text-end">${formatAmount(item.totalPrice)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div>Sous-total HT : ${formatAmount(subTotal)} DH</div>
    ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
    <div>Total HT : ${formatAmount(totalAfterDiscountHT)} DH</div>
    <div>TVA (${formData.tvaRate}%) : +${formatAmount(tvaAmount)} DH</div>
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

  <div class="footer">
    <p style="margin:2px 0;">
      <strong>Siège Social:</strong> Bni Boughamaren, Arimam Ihaddaden &nbsp;|&nbsp;
      <strong>Magasin:</strong> Hay Barraka Près de mosquée I Awaden
    </p>
    <p style="margin:2px 0;">
      ☎ 06.07.15.05.50 — 06.58.52.72.41 &nbsp;|&nbsp;
      📱 06.09.68.52.11 &nbsp;|&nbsp;
      Email: ibaghatrachid83@gmail.com
    </p>
    <p style="margin:2px 0;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747 — ICE: 003013206000054</p>
    <p style="margin-top:6px;">Signature et cachet: _________________________</p>
  </div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(() => window.close(), 100);
    };
  </script>

</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.left = "-9999px";
      container.style.width = "210mm";
      container.style.minHeight = "297mm";
      container.style.padding = "10mm 10mm 40mm 10mm";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "0.65rem";
      container.style.textTransform = "uppercase";
      container.style.background = "#fff";

      const creationDateFormatted = formatDateWithTime(formData.issueDate);

      container.innerHTML = `
      <div style="border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h2 style="margin:0; font-size:1rem; letter-spacing:1px;">FACTURE</h2>
          <div style="font-weight:bold; margin-top:4px;">STE. RACHIGLASS S.A.R.L. A.U</div>
          <div>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</div>
          <div>Tél: +212 606-071505 / +212 658-527241 / +212 609-685211</div>
          <div>Email: ibaghatrachid83@gmail.com</div>
          <div>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</div>
          <div>ICE: 003013206000054</div>
        </div>
        <div style="text-align:right;">
          <strong>N° Facture :</strong> ${facture.invoiceNumber}<br/>
          <strong>Date création :</strong> ${creationDateFormatted}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <strong>Client :</strong><br/>
        ${formData.customerName}<br/>
        ${formData.customerPhone ? `Tél: ${formData.customerPhone}` : ""}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.65rem;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Code</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Désignation</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Qté</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Long.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Larg.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Prix U</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map(
              (item) => `
            <tr>
              <td style="border:1.5px solid #000; padding:6px;">${item.code || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px;">${item.designation || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${item.quantity}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${item.v1}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${item.v2}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:right;">${formatAmount(item.unitPrice)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:right;">${formatAmount(item.totalPrice)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div style="margin-top:25px; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <div>Sous-total HT : ${formatAmount(subTotal)} DH</div>
        ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
        <div>Total HT : ${formatAmount(totalAfterDiscountHT)} DH</div>
        <div>TVA (${formData.tvaRate}%) : +${formatAmount(tvaAmount)} DH</div>
        <div style="display:flex; gap:15px; font-weight:bold;">
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">Net TTC à payer</span>
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">${formatAmount(totalTTC)} DH</span>
        </div>
        ${
          totalAdvancement > 0
            ? `
          <div>Avancements : -${formatAmount(totalAdvancement)} DH</div>
          <div>Reste à payer : ${formatAmount(remainingAmount)} DH</div>
        `
            : ""
        }
        <div style="font-style:italic; font-weight:bold; font-size:0.7rem; text-align:right;">
          ${totalToFrenchText(totalTTC)}
        </div>
      </div>

      <div style="
        position: absolute;
        bottom: 10mm;
        left: 10mm;
        right: 10mm;
        border-top: 2px solid #000;
        padding-top: 8px;
        text-align: center;
        font-size: 8px;
        color: #444;
      ">
        <p style="margin:2px 0;">
          <strong>Siège Social:</strong> Bni Boughamaren, Arimam Ihaddaden &nbsp;|&nbsp;
          <strong>Magasin:</strong> Hay Barraka Près de mosquée I Awaden
        </p>
        <p style="margin:2px 0;">
          ☎ 06.07.15.05.50 — 06.58.52.72.41 &nbsp;|&nbsp;
          📱 06.09.68.52.11 &nbsp;|&nbsp;
          Email: ibaghatrachid83@gmail.com
        </p>
        <p style="margin:2px 0;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747 — ICE: 003013206000054</p>
        <p style="margin-top:6px;">Signature et cachet: _________________________</p>
      </div>
    `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#fff",
      });

      document.body.removeChild(container);

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        imgHeight,
      );
      pdf.save(`Facture-${facture.invoiceNumber}.pdf`);

      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error(err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button color="light" onClick={() => navigate("/factures")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Facture #{facture.invoiceNumber}
            <Badge color={getStatusColor(formData.status)} className="ms-3">
              {statusOptions.find((o) => o.value === formData.status)?.label ||
                formData.status}
            </Badge>
          </h3>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button color="outline-primary" onClick={handlePrint}>
            <FiPrinter className="me-2" /> Imprimer
          </Button>
          <Button color="outline-secondary" onClick={generateAndDownloadPDF}>
            <FiDownload className="me-2" /> PDF
          </Button>
        </div>
      </div>

      <Row>
        {/* Client Info */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiUser className="me-2" /> Client
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">Nom Client *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerPhone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Facture Info */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Informations
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">Date et Heure</label>
                <DatePicker
                  selected={formData.issueDate}
                  onChange={(date) =>
                    setFormData((prev) => ({ ...prev, issueDate: date }))
                  }
                  className="form-control"
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeCaption="Heure"
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Statut</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Type de Paiement</label>
                <select
                  className="form-control"
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentType: e.target.value,
                    }))
                  }
                >
                  {paymentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* TVA Settings */}
      <Card className="p-3 mb-4">
        <h5>
          <FiPercent className="me-2" /> TVA
        </h5>
        <Row className="mt-3">
          <Col md={6}>
            <div className="form-group mb-3">
              <label className="form-label">Taux de TVA</label>
              <select
                className="form-control"
                value={formData.tvaRate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tvaRate: parseFloat(e.target.value),
                  }))
                }
              >
                {tvaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={6}>
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
                      setFormData((prev) => ({
                        ...prev,
                        includeTvaInPrice: true,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="ttc">
                    Prix TTC
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
                      setFormData((prev) => ({
                        ...prev,
                        includeTvaInPrice: false,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="ht">
                    Prix HT
                  </label>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Card className="p-3 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>
            <FiShoppingCart className="me-2" /> Articles
          </h5>
          <Button color="primary" size="sm" onClick={addItem}>
            <FiPlus className="me-1" /> Ajouter Article
          </Button>
        </div>

        <div className="table-responsive" style={{ overflow: "visible" }}>
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: "10%" }}>Code</th>
                <th style={{ width: "25%" }}>Désignation</th>
                <th style={{ width: "8%" }}>Qté</th>
                <th style={{ width: "10%" }}>Longueur</th>
                <th style={{ width: "10%" }}>Largeur</th>
                <th style={{ width: "12%" }}>Prix/Unité</th>
                <th style={{ width: "10%" }}>Total HT</th>
                <th style={{ width: "5%" }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Aucun article. Cliquez sur "Ajouter Article" pour commencer.
                  </td>
                </tr>
              ) : (
                formData.items.map((item, index) => (
                  <tr key={item.id || index}>
                    {/* Code - STATIC */}
                    <td className="align-middle">
                      <span className="fw-bold text-primary">
                        {item.produit?.reference || item.code || "—"}
                      </span>
                    </td>

                    {/* Designation - Product Select */}
                    <td>
                      {loadingProduits ? (
                        <div className="text-center py-2 text-muted">Chargement...</div>
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

                    {/* Qté - INPUT */}
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

                    {/* Longueur - INPUT */}
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

                    {/* Largeur - INPUT */}
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

                    {/* Prix/Unité - INPUT */}
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

                    {/* Total HT - STATIC */}
                    <td className="align-middle text-end">
                      <span className="fw-bold text-success">
                        {item.totalPrice?.toFixed(2) || "0.00"}
                      </span>
                    </td>

                    {/* Delete button */}
                    <td className="align-middle text-center">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeItem(index)}
                        title="Supprimer cet article"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Advancements Section */}
      <Card className="p-3 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Avancements</h5>
          <Button color="primary" size="sm" onClick={addAdvancement}>
            <FiPlus className="me-1" /> Ajouter Avancement
          </Button>
        </div>

        {formData.advancements.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Montant (Dh)</th>
                  <th>Méthode</th>
                  <th>Référence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.advancements.map((adv, index) => (
                  <tr key={adv.id || index}>
                    <td>
                      <DatePicker
                        selected={adv.paymentDate}
                        onChange={(date) =>
                          handleAdvancementChange(index, "paymentDate", date)
                        }
                        className="form-control form-control-sm"
                        dateFormat="dd/MM/yyyy"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={adv.amount}
                        onChange={(e) =>
                          handleAdvancementChange(
                            index,
                            "amount",
                            e.target.value,
                          )
                        }
                        min="0.01"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={adv.paymentMethod}
                        onChange={(e) =>
                          handleAdvancementChange(
                            index,
                            "paymentMethod",
                            e.target.value,
                          )
                        }
                      >
                        <option value="espece">Espèce</option>
                        <option value="cheque">Chèque</option>
                        <option value="virement">Virement</option>
                        <option value="carte">Carte</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={adv.reference}
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
                    <td className="text-center">
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
          <div className="alert alert-info">Aucun avancement enregistré.</div>
        )}
      </Card>

      {/* Summary */}
      <Card className="p-3">
        <h5>Résumé financier</h5>
        <Row className="mt-3">
          <Col md={7}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Sous-total HT:</span>
                <strong>{formatAmount(subTotal)} Dh</strong>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Remise:</span>
                  <span>-{formatAmount(discount)} Dh</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Total HT:</span>
                <strong>{formatAmount(totalAfterDiscountHT)} Dh</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>TVA ({formData.tvaRate}%):</span>
                <strong className="text-info">
                  +{formatAmount(tvaAmount)} Dh
                </strong>
              </div>
              <div className="d-flex justify-content-between mb-2 fw-bold border-top pt-2">
                <span>Total TTC:</span>
                <span className="text-primary">
                  {formatAmount(totalTTC)} Dh
                </span>
              </div>
              <div className="mt-3 small fst-italic">
                <strong>{totalToFrenchText(totalTTC)}</strong>
              </div>
            </div>
          </Col>

          <Col md={5}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Avancements:</span>
                <strong className="text-success">
                  {formatAmount(totalAdvancement)} Dh
                </strong>
              </div>
              <div className="d-flex justify-content-between fw-bold border-top pt-2">
                <span>Reste à payer:</span>
                <span
                  className={
                    remainingAmount > 0 ? "text-danger" : "text-success"
                  }
                >
                  {formatAmount(remainingAmount)} Dh
                </span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default FactureDetailsPage;
