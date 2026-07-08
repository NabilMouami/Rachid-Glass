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
import Select from "react-select";
import { components } from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const roundToNextMultipleOfThree = (value) => {
  const num = parseFloat(value) || 0;
  if (num <= 0) return 0;
  return Math.ceil(num / 3) * 3;
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

    // TVA specific fields
    tvaRate: 20,
    includeTvaInPrice: true,

    items: [],
    advancements: [],
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
      setFormData((prev) => ({
        ...prev,
        customerName: selectedClient.nom_complete || "",
        customerPhone: selectedClient.telephone || "",
      }));
    }
  };

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
      const calcV1 = roundToNextMultipleOfThree(item.v1) / 100;
      const calcV2 = roundToNextMultipleOfThree(item.v2) / 100;
      updatedItems[index] = {
        ...item,
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: unitPrice,
        totalPrice: item.quantity * calcV1 * calcV2 * unitPrice,
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
        ice: data.ice || "",
        ste: data.ste || "",
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
  const subTotal = formData.items.reduce((sum, item) => {
    return sum + (item.totalPrice || 0);
  }, 0);

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const discount = calculateDiscount();
  const totalHT = Math.max(0, subTotal - discount);

  // TVA = Total HT × (TVA_rate / 100)
  const tvaRate = parseFloat(formData.tvaRate) || 20;
  const tvaAmount = totalHT * (tvaRate / 100);

  // Total TTC = Total HT + TVA
  const totalTTC = totalHT + tvaAmount;

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

    // Recalculate total with v1/v2 factors
    const item = updatedItems[index];
    const calcV1 = roundToNextMultipleOfThree(item.v1) / 100;
    const calcV2 = roundToNextMultipleOfThree(item.v2) / 100;
    updatedItems[index].totalPrice = item.quantity * calcV1 * calcV2 * item.unitPrice;

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

  const buildPrintHTML = ({ autoPrint = false } = {}) => {
    const creationDateFormatted = formatDateWithTime(formData.issueDate);

    return `
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


    .info {
    margin-top: 120px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .client-name {
      font-weight: 700;
      font-size: 0.75rem;
      margin-top: 2px;
      display: inline-block;
    }

    .client-detail {
      margin-top: 6px;
      padding: 5px 10px;
      background: #f4f7fb;
      border-left: 3px solid #1a3a6e;
      border-radius: 0 4px 4px 0;
      font-size: 0.7rem;
      line-height: 1.5;
    }

    .client-detail-label {
      font-weight: 800;
      color: #1a3a6e;
      letter-spacing: 0.5px;
    }

    .client-detail-value {
      font-weight: 700;
      color: #000;
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
      <span class="client-name">${formData.customerName}</span><br/>
      ${formData.ice ? `<div class="client-detail"><span class="client-detail-label">ICE :</span> <span class="client-detail-value">${formData.ice}</span></div>` : ""}
      ${formData.ste ? `<div class="client-detail"><span class="client-detail-label">STE :</span> <span class="client-detail-value">${formData.ste}</span></div>` : ""}
    </div>
     <div style="text-align:right;">
      <strong>N° Facture :</strong> ${facture.invoiceNumber}<br/>
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
    <div>TVA (${tvaRate}%) :</div>
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

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = buildPrintHTML({ autoPrint: true });

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      const html = buildPrintHTML();

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
                <th style={{ width: "15%" }}>Code</th>
                <th style={{ width: "30%" }}>Désignation</th>
                <th style={{ width: "10%" }}>Qté</th>
                <th style={{ width: "15%" }}>Prix/Unité</th>
                <th style={{ width: "15%" }}>Total HT</th>
                <th style={{ width: "5%" }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
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
                              Stock: {item.produit.qty || 0} | Prix:{" "}
                              {item.unitPrice?.toFixed(2) || "0.00"} DH
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
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Remise:</span>
                  <span>-{formatAmount(discount)} Dh</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Total HT:</span>
                <strong>{formatAmount(totalHT)} Dh</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>TVA (20%):</span>
                <strong className="text-info">20%</strong>
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
