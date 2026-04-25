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
  FiSave,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import AsyncSelect from "react-select/async";
import Select from "react-select";

const MySwal = withReactContent(Swal);

// Function to round to next multiple of 3
const roundToNextMultipleOfThree = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) return 1;
  if (numValue % 3 === 0) return numValue;
  return Math.ceil(numValue / 3) * 3;
};

// Helper function to calculate total price
const calculateItemTotalPrice = (v1, v2, qty, price) => {
  const numV1 = parseFloat(v1) || 0;
  const numV2 = parseFloat(v2) || 0;
  const numQty = parseFloat(qty) || 0;
  const numPrice = parseFloat(price) || 0;

  // If both v1 and v2 are 1, calculate as simple: qty * price
  if (numV1 === 1 && numV2 === 1) {
    return numQty * numPrice;
  }

  // Otherwise use the roundToNextMultipleOfThree formula
  const calcV1 = roundToNextMultipleOfThree(numV1) / 100;
  const calcV2 = roundToNextMultipleOfThree(numV2) / 100;
  return numQty * calcV1 * calcV2 * numPrice;
};

// Calculate Metre Lin for an item (only for non-simple items)
const calculateMetreLin = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  // Return 0 for simple calculations (v1=1 and v2=1)
  if (v1 === 1 && v2 === 1) return 0;
  const calcV1 = roundToNextMultipleOfThree(v1) / 100;
  const calcV2 = roundToNextMultipleOfThree(v2) / 100;
  const qty = parseFloat(item.quantity) || 0;
  return (calcV1 + calcV2) * 2 * qty;
};

// Calculate Surface for an item (only for non-simple items)
const calculateSurface = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  // Return 0 for simple calculations (v1=1 and v2=1)
  if (v1 === 1 && v2 === 1) return 0;
  const calcV1 = roundToNextMultipleOfThree(v1) / 100;
  const calcV2 = roundToNextMultipleOfThree(v2) / 100;
  const qty = parseFloat(item.quantity) || 0;
  return qty * calcV1 * calcV2;
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
      <FiTrash2 size={14} color="#6c757d" />
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
  { value: "envoyé", label: "Envoyé" },
  { value: "accepté", label: "Accepté" },
  { value: "refusé", label: "Refusé" },
  { value: "en_attente", label: "En Attente" },
  { value: "expiré", label: "Expiré" },
  { value: "converti_en_facture", label: "Converti en Facture" },
];

const discountTypeOptions = [
  { value: "fixed", label: "Montant fixe (DH)" },
  { value: "percentage", label: "Pourcentage (%)" },
];

// Your totalToFrenchText function
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

const DevisDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState(null);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    validUntil: null,
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    items: [],
  });

  useEffect(() => {
    if (id) {
      fetchDevisDetails();
    }
  }, [id]);

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
      // Clear product selection
      updatedItems[index] = {
        ...updatedItems[index],
        code: "",
        designation: "",
        articleName: "",
        produit_id: null,
        produit: null,
        unitPrice: 0,
        totalPrice: 0,
      };
    } else {
      const produit = selectedOption.data;
      updatedItems[index] = {
        ...updatedItems[index],
        code: produit.reference,
        designation: produit.designation,
        articleName: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: parseFloat(produit.prix_vente) || 0,
        totalPrice: calculateItemTotalPrice(
          updatedItems[index].v1,
          updatedItems[index].v2,
          updatedItems[index].quantity,
          parseFloat(produit.prix_vente) || 0,
        ),
      };
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const fetchDevisDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config_url}/api/devis/${id}`);
      const data = res.data.devis || res.data;

      setDevis(data);

      // Map lignes to items format
      const mappedItems = data.lignes
        ? data.lignes.map((ligne, index) => {
            return {
              id: ligne.id || `temp-${index}`,
              code: ligne.produit?.reference || ligne.code || "",
              designation:
                ligne.articleName ||
                ligne.produit?.designation ||
                ligne.designation ||
                "",
              articleName:
                ligne.articleName || ligne.produit?.designation || "",
              quantity: parseFloat(ligne.quantite) || 0,
              v1: parseFloat(ligne.v1) || 1,
              v2: parseFloat(ligne.v2) || 1,
              unitPrice: parseFloat(ligne.prix_unitaire) || 0,
              totalPrice: calculateItemTotalPrice(
                ligne.v1,
                ligne.v2,
                ligne.quantite,
                ligne.prix_unitaire,
              ),
              produit_id: ligne.produit_id,
              produit: ligne.produit || null,
            };
          })
        : [];

      setFormData({
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || "",
        status: data.status || "brouillon",
        discountType: data.discountType || "fixed",
        discountValue: parseFloat(data.discountValue) || 0,
        items: mappedItems,
      });
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement du devis", "error");
      navigate("/devis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement du devis...</div>
      </Container>
    );
  }

  if (!devis) {
    return (
      <Container className="py-5">
        <Alert color="danger">Devis introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/devis")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // Calculations
  const subTotal = formData.items.reduce(
    (sum, item) => sum + (parseFloat(item.totalPrice) || 0),
    0,
  );

  // Calculate sum of all Metre Lin (excluding simple items)
  const totalMetreLin = formData.items.reduce(
    (sum, item) => sum + calculateMetreLin(item),
    0,
  );

  // Calculate sum of all Surface (excluding simple items)
  const totalSurface = formData.items.reduce(
    (sum, item) => sum + calculateSurface(item),
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * (formData.discountValue || 0)) / 100;
    }
    return formData.discountValue || 0;
  };

  const discount = calculateDiscount();
  const totalAfterDiscount = Math.max(0, subTotal - discount);

  const getStatusColor = (s) => {
    switch (s) {
      case "brouillon":
        return "warning";
      case "accepté":
        return "success";
      case "envoyé":
        return "info";
      case "refusé":
        return "danger";
      case "expiré":
        return "dark";
      case "converti_en_facture":
        return "primary";
      default:
        return "secondary";
    }
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

  // Handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: ["designation", "code", "articleName"].includes(field)
        ? value
        : parseFloat(value) || 0,
    };

    const item = updatedItems[index];
    updatedItems[index].totalPrice = calculateItemTotalPrice(
      item.v1,
      item.v2,
      item.quantity,
      item.unitPrice,
    );

    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      code: "",
      designation: "",
      articleName: "",
      quantity: 1,
      v1: 1,
      v2: 1,
      unitPrice: 0,
      totalPrice: 0,
      produit_id: null,
      produit: null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = async (index) => {
    const item = formData.items[index];

    if (item.id && !String(item.id).startsWith("temp-")) {
      const confirm = await MySwal.fire({
        title: "Supprimer cet article?",
        text: "Êtes-vous sûr de vouloir supprimer cet article?",
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

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      topTost("Le devis doit avoir au moins un article", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare items for backend with all required fields
      const preparedItems = formData.items.map((item) => ({
        id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
        produit_id: item.produit_id,
        articleName: item.designation || item.articleName || "Article",
        quantite: (item.quantity || 1).toString(),
        v1: (item.v1 || 1).toString(),
        v2: (item.v2 || 1).toString(),
        v3: "1",
        prix_unitaire: (item.unitPrice || 0).toString(),
        total_ligne: (item.totalPrice || 0).toString(),
        remise_ligne: "0",
      }));

      const updateData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        issueDate: formData.issueDate.toISOString(),
        validUntil: formData.validUntil
          ? formData.validUntil.toISOString()
          : null,
        status: formData.status,
        notes: formData.notes,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        subTotal: subTotal,
        total: totalAfterDiscount,
        discountAmount: discount,
        lignes: preparedItems,
      };

      console.log("Sending update data:", updateData);

      const response = await axios.put(
        `${config_url}/api/devis/${id}`,
        updateData,
      );

      topTost("Devis mis à jour avec succès!", "success");

      // Refresh data
      fetchDevisDetails();
    } catch (error) {
      console.error("Error updating devis:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erreur lors de la mise à jour du devis";

      if (error.response?.data?.errors) {
        console.error("Validation errors:", error.response.data.errors);
      }

      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>DEVIS ${devis.devisNumber}</title>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; text-transform: uppercase; }
    body {
      width: 100%;
      margin: 0;
      padding: 5mm;
      padding-bottom: 70px;
      font-family: Arial, sans-serif;
      font-size: 0.6rem;
      color: #000;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 { font-size: 0.9rem; letter-spacing: 1px; margin: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1.5px solid #000;
      padding: 5px;
      vertical-align: middle;
    }
    th { background: #f2f2f2; text-align: center; }
    td { text-align: left; }
    .totals {
      margin-top: 25px;
      text-align: right;
    }
    .net-box {
      display: inline-block;
      border: 2px solid #000;
      padding: 10px 16px;
      margin-right: 20px;
      margin-top: 8px;
      font-weight: bold;
      text-align: right;
    }
    .validity {
      margin-top: 20px;
      font-style: italic;
      font-size: 0.7rem;
    }
    .italic {
      font-style: italic;
      font-size: 0.7rem;
      margin: 20px;
      font-weight: bold;
    }
    .text-end { text-align: right; }
    .text-center { text-align: center; }
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
      <h2>DEVIS</h2>
      <div style="font-weight:bold; margin-top:4px;">STE. RACHIGLASS S.A.R.L. A.U</div>
      <div>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</div>
      <div>Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</div>
      <div>Email: ibaghatrachid83@gmail.com</div>
      <div>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</div>
      <div>ICE: 003013206000054</div>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0;"><strong>N° Devis :</strong> ${devis.devisNumber}</p>
      <p style="margin: 5px 0;"><strong>Date :</strong> ${formatDateOnly(formData.issueDate)}</p>
    </div>
  </div>

  <div style="margin: 20px 0;">
    <strong>Client :</strong> ${formData.customerName}<br/>
    <strong>Téléphone :</strong> ${formData.customerPhone || "—"}<br/>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Long.</th>
        <th>Larg.</th>
        <th>Mtre Lin.</th>
        <th>Surface</th>
        <th>Prix U</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map((item) => {
          const v1 = parseFloat(item.v1) || 1;
          const v2 = parseFloat(item.v2) || 1;
          const isSimpleCalc = v1 === 1 && v2 === 1;
          const qty = parseFloat(item.quantity) || 0;

          // Calculate metre lin and surface with rounded values
          const calcV1 = roundToNextMultipleOfThree(v1) / 100;
          const calcV2 = roundToNextMultipleOfThree(v2) / 100;

          return `
        <tr>
          <td>${item.code || "—"}</td>
          <td>${item.designation || "—"}</td>
          <td class="text-center">${item.quantity || 0}</td>
          <td class="text-center">${(parseFloat(item.v1) || 1) === 1 ? "-" : item.v1 || 1}</td>
          <td class="text-center">${(parseFloat(item.v2) || 1) === 1 ? "-" : item.v2 || 1}</td>
          <td class="text-center">${isSimpleCalc ? "-" : ((calcV1 + calcV2) * 2 * qty).toFixed(2)}</td>
          <td class="text-center">${isSimpleCalc ? "-" : (qty * calcV1 * calcV2).toFixed(4)}</td>
          <td class="text-end">${formatAmount(item.unitPrice || 0)}</td>
          <td class="text-end">${formatAmount(item.totalPrice || 0)}</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div>Sous-total: ${formatAmount(subTotal)} Dh</div>
    ${discount > 0 ? `<div>Remise: -${formatAmount(discount)} Dh</div>` : ""}
    <div class="net-box">
      TOTAL : ${formatAmount(totalAfterDiscount)} DH
    </div>
    <div>Total Mètre Lin: ${totalMetreLin.toFixed(2)} ML</div>
    <div>Total Surface: ${totalSurface.toFixed(4)} m²</div>
    <div class="italic">
      ${totalToFrenchText(totalAfterDiscount)}
    </div>
  </div>

  ${formData.notes ? `<div class="validity">Notes: ${formData.notes}</div>` : ""}

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
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 100);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // PDF Generation function
  const generateAndDownloadPDF = async () => {
    try {
      const container = document.createElement("div");
      container.style.width = "210mm";
      container.style.minHeight = "296mm"; // Full A4 height
      container.style.padding = "15mm 20mm";
      container.style.background = "white";
      container.style.color = "#000";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "11px";
      container.style.lineHeight = "1.5";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.boxSizing = "border-box";
      container.style.display = "flex";
      container.style.flexDirection = "column";

      const formatDateOnly = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("fr-FR");
      };

      container.innerHTML = `
      <div style="flex: 1;">
        <div style="color:#000;display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2c5aa0;">
          <div>
            <h3 style="margin:0; font-size:18px; letter-spacing:1px; color:#2c5aa0;">DEVIS</h3>
            <div style="font-weight:bold; margin-top:4px; font-size:12px;">STE. RACHIGLASS S.A.R.L. A.U</div>
            <div style="font-size:10px;">VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</div>
            <div style="font-size:9px;">Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</div>
            <div style="font-size:9px;">Email: ibaghatrachid83@gmail.com</div>
            <div style="font-size:9px;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</div>
            <div style="font-size:9px;">ICE: 003013206000054</div>
          </div>
          <div style="color:#000;text-align:right; font-size:11px;">
            <p style="margin:2px 0;"><strong>N° DEVIS :</strong> ${devis.devisNumber}</p>
            <p style="margin:2px 0;"><strong>DATE :</strong> ${formatDateOnly(formData.issueDate)}</p>
          </div>
        </div>

        <div style="color:#000;margin-bottom:20px; font-size:11px;">
          <p style="margin:2px 0;"><strong>CLIENT :</strong> ${formData.customerName}</p>
          <p style="margin:2px 0;"><strong>TÉL :</strong> ${formData.customerPhone || "—"}</p>
        </div>

        <table style="color:#000;width:100%; border-collapse:collapse; margin-bottom:20px; font-size:10px;">
          <thead>
            <tr style="background:#2c5aa0; color:#fff;">
              <th style="border:1px solid #2c5aa0; padding:8px;">CODE</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">DÉSIGNATION</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">QTÉ</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">LONG.</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">LARG.</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">Mtre Lin.</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">Surface</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">PRIX U</th>
              <th style="border:1px solid #2c5aa0; padding:8px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${formData.items
              .map((item, index) => {
                const v1 = parseFloat(item.v1) || 1;
                const v2 = parseFloat(item.v2) || 1;
                const isSimpleCalc = v1 === 1 && v2 === 1;
                const qty = parseFloat(item.quantity) || 0;

                // Calculate metre lin and surface with rounded values
                const calcV1 = roundToNextMultipleOfThree(v1) / 100;
                const calcV2 = roundToNextMultipleOfThree(v2) / 100;

                return `
                <tr style="${index % 2 === 0 ? "background:#f9f9f9;" : ""}">
                  <td style="border:1px solid #ddd; padding:6px;">${item.code || "—"}</td>
                  <td style="border:1px solid #ddd; padding:6px;">${item.designation || "—"}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${item.quantity || 0}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${v1 === 1 ? "-" : item.v1 || 1}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${v2 === 1 ? "-" : item.v2 || 1}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${isSimpleCalc ? "-" : ((calcV1 + calcV2) * 2 * qty).toFixed(2)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${isSimpleCalc ? "-" : (qty * calcV1 * calcV2).toFixed(4)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatAmount(item.unitPrice || 0)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatAmount(item.totalPrice || 0)}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

        <div style="color:#000;text-align:right; margin-top:25px; font-size:11px;">
          <div style="margin:2px 0;">Sous-total: ${formatAmount(subTotal)} Dh</div>
          ${discount > 0 ? `<div style="margin:2px 0;">Remise: -${formatAmount(discount)} Dh</div>` : ""}
          <div style="display:inline-block; border:2px solid #2c5aa0; color:#2c5aa0; padding:12px 18px; font-weight:bold; margin-top:8px; font-size:14px;">
            TOTAL : ${formatAmount(totalAfterDiscount)} DH
          </div>
          <div style="margin:2px 0; margin-top:12px;">Total Mètre Lin: ${totalMetreLin.toFixed(2)} ML</div>
          <div style="margin:2px 0;">Total Surface: ${totalSurface.toFixed(4)} m²</div>
          <div style="font-style:italic; margin-top:10px; font-size:10px; font-weight:bold;">
            ${totalToFrenchText(totalAfterDiscount)}
          </div>
        </div>

        ${formData.notes ? `<div style="margin-top:20px; font-style:italic; font-size:10px;">Notes: ${formData.notes}</div>` : ""}
      </div>

      <!-- Footer - This will always be at the bottom -->
      <div style="
        margin-top: auto;
        border-top: 2px solid #2c5aa0;
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
      </div>
    `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
        windowWidth: 210 * 3.7795275591, // Convert mm to pixels (1mm = 3.78px approximately)
        windowHeight: 297 * 3.7795275591,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Devis-${devis.devisNumber}.pdf`);
      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button color="light" onClick={() => navigate("/devis")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Devis #{devis?.devisNumber}
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
          <Button
            color="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <FiSave className="me-2" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
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

        {/* Devis Info */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Informations
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">Date Devis</label>
                <DatePicker
                  selected={formData.issueDate}
                  onChange={(date) =>
                    setFormData((prev) => ({ ...prev, issueDate: date }))
                  }
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
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
            </div>
          </Card>
        </Col>
      </Row>

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

        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: "10%" }}>Code/Ref</th>
                <th style={{ width: "20%" }}>Désignation</th>
                <th style={{ width: "6%" }}>Qté</th>
                <th style={{ width: "8%" }}>Longueur</th>
                <th style={{ width: "8%" }}>Largeur</th>
                <th style={{ width: "10%" }}>Prix/Unité</th>
                <th style={{ width: "10%" }}>Total</th>
                <th style={{ width: "5%" }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-muted">
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

                    {/* Longueur - INPUT */}
                    <td>
                      {parseFloat(item.v1) === 1 ? (
                        <span className="text-primary fw-bold">-</span>
                      ) : (
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
                      )}
                    </td>

                    {/* Largeur - INPUT */}
                    <td>
                      {parseFloat(item.v2) === 1 ? (
                        <span className="text-primary fw-bold">-</span>
                      ) : (
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
                      )}
                    </td>

                    {/* prix/Unité - INPUT */}
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

                    {/* Total - STATIC */}
                    <td className="align-middle text-end">
                      <span className="fw-bold text-success">
                        {formatAmount(item.totalPrice)}
                      </span>
                    </td>

                    {/* Delete button */}
                    <td className="align-middle text-center">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeItem(index)}
                        title="supprimer cet article"
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

      {/* Discount Section */}
      <Card className="p-3 mb-4">
        <h5>Remise</h5>
        <Row className="mt-3">
          <Col md={4}>
            <div className="form-group">
              <label className="form-label">Type de remise</label>
              <select
                className="form-control"
                value={formData.discountType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountType: e.target.value,
                  }))
                }
              >
                {discountTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={4}>
            <div className="form-group">
              <label className="form-label">
                Valeur {formData.discountType === "percentage" ? "(%)" : "(DH)"}
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountValue: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                step={formData.discountType === "percentage" ? "1" : "0.01"}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Notes */}
      <Card className="p-3 mb-4">
        <h5>Notes</h5>
        <textarea
          className="form-control"
          rows="3"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Notes ou conditions particulières..."
        />
      </Card>

      {/* Summary */}
      <Card className="p-3">
        <h5>Résumé</h5>
        <Row className="mt-3">
          <Col md={{ size: 6, offset: 6 }}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Sous-total:</span>
                <strong>{formatAmount(subTotal)} Dh</strong>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Remise:</span>
                  <span>-{formatAmount(discount)} Dh</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2 fw-bold border-top pt-2">
                <span>Total:</span>
                <span>{formatAmount(totalAfterDiscount)} Dh</span>
              </div>
              <div className="d-flex justify-content-between mt-2 pt-2 border-top small text-secondary">
                <span>Total Mètre Lin:</span>
                <span>{totalMetreLin.toFixed(2)} ML</span>
              </div>
              <div className="d-flex justify-content-between small text-secondary">
                <span>Total Surface:</span>
                <span>{totalSurface.toFixed(4)} m²</span>
              </div>
              <div className="mt-3 small fst-italic">
                <strong>{totalToFrenchText(totalAfterDiscount)}</strong>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default DevisDetailsPage;
