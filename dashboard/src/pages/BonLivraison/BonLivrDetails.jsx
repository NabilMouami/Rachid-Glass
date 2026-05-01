import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import AsyncSelect from "react-select/async";
import Select from "react-select";
import { components } from "react-select";
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

const MySwal = withReactContent(Swal);

// Function to round to next multiple of 3
const roundToNextMultipleOfThree = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) return 1;
  if (numValue % 3 === 0) return numValue;
  return Math.ceil(numValue / 3) * 3;
};

const calculateItemTotal = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;

  // If both v1 and v2 are 1, calculate as simple: qty * price
  if (v1 === 1 && v2 === 1) {
    return qty * price;
  }

  // Otherwise use the roundToNextMultipleOfThree formula
  const calcV1 = roundToNextMultipleOfThree(v1) / 100;
  const calcV2 = roundToNextMultipleOfThree(v2) / 100;
  return qty * calcV1 * calcV2 * price;
};

const calculateMetreLin = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  // Return 0 for simple calculations (v1=1 and v2=1)
  if (v1 === 1 && v2 === 1) return 0;
  const calcV1 = v1 / 100;
  const calcV2 = v2 / 100;
  const qty = parseFloat(item.quantity) || 0;
  return (calcV1 + calcV2) * 2 * qty;
};

const calculateSurface = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  // Return 0 for simple calculations (v1=1 and v2=1)
  if (v1 === 1 && v2 === 1) return 0;
  const calcV1 = v1 / 100;
  const calcV2 = v2 / 100;
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

// Payment methods for advancements
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
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

const BonLivraisonDetailsPage = () => {
  const { id } = useParams();
  const { User } = useSelector((state) => state.userInfo);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bon, setBon] = useState(null);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    paymentType: "non_paye",
    items: [],
    advancements: [],
  });

  useEffect(() => {
    if (id) {
      fetchBonDetails();
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
      }
    };
    fetchClients();
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
      // Clear product selection
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
      updatedItems[index] = {
        ...updatedItems[index],
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: parseFloat(produit.prix_vente) || 0,
        totalPrice: calculateItemTotal(updatedItems[index]),
      };
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const fetchBonDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config_url}/api/bonlivraisons/${id}`);
      const data = res.data;

      setBon(data);

      // Map lignes to items format - produit comes from API
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
        issueDate: data.created_at ? new Date(data.created_at) : new Date(),
        notes: data.notes || "",
        status: data.status || "brouillon",
        discountType: data.discountType || "fixed",
        discountValue: parseFloat(data.discountValue) || 0,
        paymentType: data.paymentType || "non_paye",
        items: mappedItems,
        advancements: mappedAdvancements,
      });

      setSelectedClientId(data.client_id || "");
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement bon de livraison", "error");
      navigate("/bon-livraisons");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement du bon de livraison...</div>
      </Container>
    );
  }

  if (!bon) {
    return (
      <Container className="py-5">
        <Alert color="danger">Bon de livraison introuvable</Alert>
        <Button color="primary" onClick={() => navigate("/bon-livraisons")}>
          <FiArrowLeft className="me-2" /> Retour
        </Button>
      </Container>
    );
  }

  // Calculations
  const subTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );

  const totalMetreLin = formData.items.reduce(
    (sum, item) => sum + calculateMetreLin(item),
    0,
  );

  const totalSurface = formData.items.reduce(
    (sum, item) => sum + calculateSurface(item),
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const discount = calculateDiscount();
  const totalAfterDiscount = Math.max(0, subTotal - discount);
  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );
  const remainingAmount = Math.max(0, totalAfterDiscount - totalAdvancement);

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

  const formatDate = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("fr-FR", {
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

  // Handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: ["designation", "code"].includes(field)
        ? value
        : parseFloat(value) || 0,
    };

    // Recalculate total
    const item = updatedItems[index];
    updatedItems[index].totalPrice = calculateItemTotal(item);

    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

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

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      topTost("Le bon de livraison doit avoir au moins un article", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        clientId: selectedClientId || null,
        issueDate: formData.issueDate.toISOString(),
        status: formData.status,
        paymentType: formData.paymentType,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        remainingAmount: remainingAmount,
        items: formData.items.map((item) => ({
          id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
          produit_id: item.produit_id,
          quantite: item.quantity?.toString() || "1",
          v1: item.v1?.toString() || "1",
          v2: item.v2?.toString() || "1",
          v3: "1",
          prix_unitaire: item.unitPrice?.toString() || "0",
          total_ligne: item.totalPrice?.toString() || "0",
          designation: item.designation || null,
        })),
        advancements: formData.advancements.map((adv) => ({
          id: adv.id?.toString().startsWith("temp-") ? undefined : adv.id,
          amount: parseFloat(adv.amount) || 0,
          paymentDate: new Date(adv.paymentDate).toISOString(),
          paymentMethod: adv.paymentMethod,
          reference: adv.reference || null,
          notes: adv.notes || null,
        })),
      };

      const response = await axios.put(
        `${config_url}/api/bonlivraisons/${id}`,
        updateData,
      );

      topTost("Bon de livraison mis à jour avec succès!", "success");

      // Refresh data
      fetchBonDetails();
    } catch (error) {
      console.error("Error updating bon livraison:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la mise à jour du bon de livraison";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
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

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Print & PDF functions
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);
    const totalText = totalToFrenchText(totalAfterDiscount);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${bon.deliveryNumber}</title>
  <meta charset="UTF-8" />
  <style>
   @page {
  margin: 0;
  size: A4;
}

@media print {
  body { margin: 15mm; }
  .no-print { display: none; }
}

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
    .info-block p { margin: 3px 0; }
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
    .table th { background-color: #f5f5f5; }
    .table td:first-child { width: 30%; }
    .totals {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .totals p { margin: 2px 0; }
        .italic {
      margin-top: 10px;
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
      border-top: 2px solid #333;
      padding: 8px 10px;
      text-align: center;
      font-size: 8px;
      color: #444;
      background: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">BON LIVRAISON</h2>
    <h3 style="margin: 5px 0;">STE. RACHIGLASS S.A.R.L. A.U</h3>
    <p>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</p>
    <p>Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</p>
  </div>


  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Client:</strong> ${formData.customerName}</p>
                  <p><strong>Créer Par:</strong> ${User.name}</p>

    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° BL:</strong> ${bon.deliveryNumber}</p>
      <p><strong>Date Creation:</strong> ${creationDateFormatted}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Designation</th>
        <th>Qté</th>
        <th>Long.</th>
        <th>Larg.</th>
        <th>Mtre Lin.</th>
        <th>Surface</th>
        <th>Prix U.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map((item) => {
          const simple =
            (parseFloat(item.v1) || 1) === 1 &&
            (parseFloat(item.v2) || 1) === 1;
          const v1 = parseFloat(item.v1) || 0;
          const v2 = parseFloat(item.v2) || 0;
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unitPrice) || 0;

          const ml = simple
            ? "-"
            : ((v1 / 100 + v2 / 100) * 2 * qty).toFixed(2);
          const surf = simple
            ? "-"
            : (qty * (v1 / 100) * (v2 / 100)).toFixed(4);
          const tot = simple
            ? (qty * price).toFixed(2)
            : (qty * (v1 / 100) * (v2 / 100) * price).toFixed(2);

          return `
        <tr>
          <td>${item.produit?.reference || item.code || "-"}</td>
          <td>${item.produit?.designation || "-"}</td>
          <td>${qty.toFixed(2)}</td>
          <td>${v1 === 1 || v1 === 0 ? "-" : v1.toFixed(2)}</td>
          <td>${v2 === 1 || v2 === 0 ? "-" : v2.toFixed(2)}</td>
          <td>${ml}</td>
          <td>${surf}</td>
          <td>${price.toFixed(2)} Dh</td>
          <td>${tot} Dh</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Net à payer:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
    <p><strong>Total Mètre Lin:</strong> ${totalMetreLin.toFixed(2)} ML</p>
    <p><strong>Total Surface:</strong> ${totalSurface.toFixed(4)} m²</p>
  </div>
  <div class="italic">${totalText}</div>


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
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePrintClient = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);
    const totalText = totalToFrenchText(totalAfterDiscount);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison Client ${bon.deliveryNumber}</title>
  <meta charset="UTF-8" />
  <style>
   @page {
  margin: 0;
  size: A4;
}

@media print {
  body { margin: 15mm; }
  .no-print { display: none; }
}

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
    .info-block p { margin: 3px 0; }
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
    .table th { background-color: #f5f5f5; }
    .table td:first-child { width: 30%; }
    .totals {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .totals p { margin: 2px 0; }
        .italic {
      margin-top: 10px;
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
      border-top: 2px solid #333;
      padding: 8px 10px;
      text-align: center;
      font-size: 8px;
      color: #444;
      background: white;
    }
  </style>
</head>
<body>
 <div class="header">
    <h2 style="margin: 0;">BON LIVRAISON</h2>
    <h3 style="margin: 5px 0;">STE. RACHIGLASS S.A.R.L. A.U</h3>
    <p>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</p>
    <p>Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</p>
  </div>



  <div class="invoice-info">
    <div class="info-block">
      <p><strong>Client:</strong> ${formData.customerName}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>N° BL:</strong> ${bon.deliveryNumber}</p>
      <p><strong>Date Creation:</strong> ${creationDateFormatted}</p>
    </div>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Designation</th>
        <th>Qté</th>
        <th>Long.</th>
        <th>Larg.</th>
        <th>Mtre Lin.</th>
        <th>Surface</th>
        <th>Prix U.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map((item) => {
          const simple =
            (parseFloat(item.v1) || 1) === 1 &&
            (parseFloat(item.v2) || 1) === 1;
          const v1 = parseFloat(item.v1) || 0;
          const v2 = parseFloat(item.v2) || 0;
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unitPrice) || 0;

          const ml = simple
            ? "-"
            : ((v1 / 100 + v2 / 100) * 2 * qty).toFixed(2);
          const surf = simple
            ? "-"
            : (qty * (v1 / 100) * (v2 / 100)).toFixed(4);
          const tot = simple
            ? (qty * price).toFixed(2)
            : (qty * (v1 / 100) * (v2 / 100) * price).toFixed(2);

          return `
        <tr>
          <td>${item.produit?.reference || item.code || "-"}</td>
          <td>${item.produit?.designation || "-"}</td>
          <td>${qty.toFixed(2)}</td>
          <td>${v1 === 1 || v1 === 0 ? "-" : v1.toFixed(2)}</td>
          <td>${v2 === 1 || v2 === 0 ? "-" : v2.toFixed(2)}</td>
          <td>${ml}</td>
          <td>${surf}</td>
          <td>${price.toFixed(2)} Dh</td>
          <td>${tot} Dh</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Net à payer:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
    <p><strong>Total Mètre Lin:</strong> ${totalMetreLin.toFixed(2)} ML</p>
    <p><strong>Total Surface:</strong> ${totalSurface.toFixed(4)} m²</p>
  </div>
  <div class="italic">${totalText}</div>


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
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const generateAndDownloadPDF = async () => {
    try {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.left = "-9999px";
      container.style.width = "210mm";
      container.style.minHeight = "297mm";
      container.style.padding = "10mm 10mm 40mm 10mm"; // extra bottom for footer
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "0.65rem";
      container.style.textTransform = "uppercase";
      container.style.background = "#fff";

      const creationDateFormatted = formatDateWithTime(formData.issueDate);

      container.innerHTML = `
      <div style="border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h2 style="margin:0; font-size:1rem; letter-spacing:1px;">BON DE LIVRAISON</h2>
          <div style="font-weight:bold; margin-top:4px;">STE. RACHIGLASS S.A.R.L. A.U</div>
          <div>VENTE TOUS TYPE DE VERRE — IMPORT / EXPORT</div>
          <div>Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</div>
          <div>Email: ibaghatrachid83@gmail.com</div>
          <div>TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</div>
          <div>ICE: 003013206000054</div>
        </div>
        <div style="text-align:right;">
          <strong>N° Bon :</strong> ${bon.deliveryNumber}<br/>
          <strong>Date création :</strong> ${creationDateFormatted}<br/>
          <strong>Préparé par :</strong> ${bon.preparedBy || bon.preparator?.name || "-"}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <strong>Client :</strong><br/>
        ${formData.customerName}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.65rem;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Code</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Désignation</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Qté</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Long.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Larg.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Mtre Lin.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Surface</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map((item) => {
              const v1 = parseFloat(item.v1) || 1;
              const v2 = parseFloat(item.v2) || 1;
              const isSimpleCalc = v1 === 1 && v2 === 1;
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unitPrice) || 0;

              // Calculate total: qty * price for simple, else qty * (v1/100rounded) * (v2/100rounded) * price
              const calcV1 = roundToNextMultipleOfThree(v1) / 100;
              const calcV2 = roundToNextMultipleOfThree(v2) / 100;
              const total = isSimpleCalc
                ? qty * price
                : qty * calcV1 * calcV2 * price;

              return `
            <tr>
              <td style="border:1.5px solid #000; padding:6px;">${item.code || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px;">${item.designation || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${item.quantity}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${v1 === 1 ? "-" : item.v1}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${v2 === 1 ? "-" : item.v2}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${isSimpleCalc ? "-" : ((calcV1 + calcV2) * 2 * qty).toFixed(2)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${isSimpleCalc ? "-" : (qty * calcV1 * calcV2).toFixed(4)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:right;">${formatAmount(total)}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>

      <div style="margin-top:25px; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <div>Sous-total : ${formatAmount(subTotal)} DH</div>
        ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
        <div style="display:flex; gap:15px; font-weight:bold;">
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">Net à payer</span>
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">${formatAmount(totalAfterDiscount)} DH</span>
        </div>
        <div style="font-style:italic; font-weight:bold; font-size:0.7rem; text-align:right;">
          ${totalToFrenchText(totalAfterDiscount)}
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
      pdf.save(`Bon-Livraison-${bon.deliveryNumber}.pdf`);

      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error(err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  // PDF for Client - without company internal info
  const generatePdfClient = async () => {
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
          <h2 style="margin:0; font-size:1rem; letter-spacing:1px;">BON DE LIVRAISON</h2>
        </div>
        <div style="text-align:right;">
          <strong>N° Bon :</strong> ${bon.deliveryNumber}<br/>
          <strong>Date :</strong> ${creationDateFormatted}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <strong>Client :</strong><br/>
        ${formData.customerName}<br/>
        ${formData.customerPhone || ""}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Code</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Désignation</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Qté</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Long.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Larg.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Mtre Lin.</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Surface</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:right;">Prix U</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map((item) => {
              const v1 = parseFloat(item.v1) || 1;
              const v2 = parseFloat(item.v2) || 1;
              const isSimpleCalc = v1 === 1 && v2 === 1;
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unitPrice) || 0;

              // Calculate total: qty * price for simple, else qty * (v1/100rounded) * (v2/100rounded) * price
              const calcV1 = roundToNextMultipleOfThree(v1) / 100;
              const calcV2 = roundToNextMultipleOfThree(v2) / 100;
              const total = isSimpleCalc
                ? qty * price
                : qty * calcV1 * calcV2 * price;

              return `
            <tr>
              <td style="border:1.5px solid #000; padding:6px;">${item.code || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px;">${item.designation || "—"}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${item.quantity}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${v1 === 1 ? "-" : item.v1}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${v2 === 1 ? "-" : item.v2}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${isSimpleCalc ? "-" : ((calcV1 + calcV2) * 2 * qty).toFixed(2)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:center;">${isSimpleCalc ? "-" : (qty * calcV1 * calcV2).toFixed(4)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:right;">${formatAmount(price)}</td>
              <td style="border:1.5px solid #000; padding:6px; text-align:right;">${formatAmount(total)}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>

      <div style="margin-top:25px; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <div>Sous-total : ${formatAmount(subTotal)} DH</div>
        ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
        <div style="display:flex; gap:15px; font-weight:bold;">
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">Net à payer</span>
          <span style="border:2px solid #000; padding:10px 18px; font-size:0.7rem;">${formatAmount(totalAfterDiscount)} DH</span>
        </div>
        <div style="font-style:italic; font-weight:bold; font-size:0.7rem; text-align:right;">
          ${totalToFrenchText(totalAfterDiscount)}
        </div>
      </div>

   
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Bon-Livraison-${bon.deliveryNumber}-Client.pdf`);

      topTost("PDF client généré et téléchargé !", "success");
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
          <Button color="light" onClick={() => navigate("/bon-livraisons")}>
            <FiArrowLeft className="me-2" /> Retour
          </Button>
          <h3 className="mt-3 mb-1">
            Bon de Livraison #{bon.deliveryNumber}
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
          <Button color="outline-info" onClick={handlePrintClient}>
            <FiPrinter className="me-2" /> Imprimer Pour Client
          </Button>
          <Button color="outline-secondary" onClick={generateAndDownloadPDF}>
            <FiDownload className="me-2" /> PDF
          </Button>
          <Button color="outline-success" onClick={generatePdfClient}>
            <FiDownload className="me-2" /> PDF Client
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
                  className="react-select"
                  classNamePrefix="react-select"
                  placeholder="Sélectionner un client"
                  value={clients.find((c) => c.value === selectedClientId)}
                  onChange={(e) => handleClientSelect(e.value)}
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "Aucun client trouvé"}
                  filterOption={(option, rawInput) => {
                    if (!rawInput) return true;
                    const search = rawInput.toLowerCase().trim();
                    return option.data.searchText.includes(search);
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "45px",
                      borderColor: "#dee2e6",
                      "&:hover": { borderColor: "#405189" },
                    }),
                  }}
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
            </div>
          </Card>
        </Col>

        {/* Bon Info */}
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Informations
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">Date Livraison</label>
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
                <th>Code</th>
                <th>Désignation</th>
                <th>Qté</th>
                <th>Longueur</th>
                <th>Largeur</th>
                <th>Mtre Linéaire</th>
                <th>Surface</th>
                <th>Prix/Unité</th>
                <th>Total</th>
                <th></th>
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
                    {/* Code - Static display */}
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

                    {/* Qty */}
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

                    {/* Longueur (v1) */}
                    <td className="align-middle text-center">
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
                          min="1"
                        />
                      )}
                    </td>

                    {/* Largeur (v2) */}
                    <td className="align-middle text-center">
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

                    {/* Metre Lineaire: Show '-' if simple calculation (v1=1 and v2=1), else calculate */}
                    <td className="align-middle text-center">
                      <span className="text-primary fw-bold">
                        {(parseFloat(item.v1) || 1) === 1 &&
                        (parseFloat(item.v2) || 1) === 1
                          ? "-"
                          : (
                              (roundToNextMultipleOfThree(
                                parseFloat(item.v1) || 0,
                              ) /
                                100 +
                                roundToNextMultipleOfThree(
                                  parseFloat(item.v2) || 0,
                                ) /
                                  100) *
                              2 *
                              (parseFloat(item.quantity) || 0)
                            ).toFixed(2)}
                      </span>
                    </td>

                    {/* Surface: Show '-' if simple calculation (v1=1 and v2=1), else calculate */}
                    <td className="align-middle text-center">
                      <span className="text-info fw-bold">
                        {(parseFloat(item.v1) || 1) === 1 &&
                        (parseFloat(item.v2) || 1) === 1
                          ? "-"
                          : (
                              (parseFloat(item.quantity) || 0) *
                              (roundToNextMultipleOfThree(
                                parseFloat(item.v1) || 0,
                              ) /
                                100) *
                              (roundToNextMultipleOfThree(
                                parseFloat(item.v2) || 0,
                              ) /
                                100)
                            ).toFixed(4)}
                      </span>
                    </td>

                    {/* Prix/Unité */}
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

                    {/* Total */}
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
          <h5>Avances</h5>
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
            Aucun avancement enregistré. Cliquez sur "Ajouter Avance" pour en
            ajouter.
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card className="p-3">
        <h5>Résumé financier</h5>
        <Row className="mt-3">
          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Sous-total:</span>
                <strong>{subTotal.toFixed(2)} Dh</strong>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Remise:</span>
                  <span>-{discount.toFixed(2)} Dh</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2 fw-bold">
                <span>Total:</span>
                <span>{totalAfterDiscount.toFixed(2)} Dh</span>
              </div>
              <div className="mt-3 small fst-italic">
                <strong>{totalToFrenchText(totalAfterDiscount)}</strong>
              </div>
            </div>
          </Col>

          <Col md={6}>
            <div className="p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Avancements:</span>
                <strong className="text-success">
                  {totalAdvancement.toFixed(2)} Dh
                </strong>
              </div>
              <div className="d-flex justify-content-between fw-bold border-top pt-2">
                <span>Reste à payer:</span>
                <span
                  className={
                    remainingAmount > 0 ? "text-danger" : "text-success"
                  }
                >
                  {remainingAmount.toFixed(2)} Dh
                </span>
              </div>
              <div className="d-flex justify-content-between text-secondary mt-2 pt-2 border-top">
                <span>Total Mètre Lin:</span>
                <span>{totalMetreLin.toFixed(2)} ML</span>
              </div>
              <div className="d-flex justify-content-between text-secondary">
                <span>Total Surface:</span>
                <span>{totalSurface.toFixed(4)} m²</span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default BonLivraisonDetailsPage;
