import React, { useState, useEffect } from "react";
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
import { useSelector } from "react-redux";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";

import withReactContent from "sweetalert2-react-content";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import { components } from "react-select";

const MySwal = withReactContent(Swal);

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

// Your totalToFrenchText function (unchanged)
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

const parseDateSafely = (dateInput) => {
  if (!dateInput) return null;

  // If it's already a valid Date object
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput;
  }

  // Try to parse as ISO string (like "2026-01-30T00:00:00.000Z")
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // If that fails, try your existing dd/MM/yyyy format parsing
  if (typeof dateInput === "string") {
    const parts = dateInput.trim().split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      // Validate reasonable values
      if (
        day >= 1 &&
        day <= 31 &&
        month >= 1 &&
        month <= 12 &&
        year >= 2000 &&
        year <= 2100
      ) {
        const fallbackDate = new Date(year, month - 1, day);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate;
      }
    }
  }

  return null;
};

const BonLivrDetailsModal = ({ isOpen, toggle, invoice, onUpdate }) => {
  const { User } = useSelector((state) => state.userInfo);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [statusKey, setStatusKey] = useState(0); // Force re-render of status select
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
    items: [],
    advancements: [],
    // Add missing fields from API
    receiverName: "",
    receiverSignature: "",
    preparedBy: "",
    deliveredBy: "",
  });

  console.log("Items: " + JSON.stringify(formData));

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
      handleInputChange("customerName", selectedClient.nom_complete || "");
      handleInputChange("customerPhone", selectedClient.telephone || "");
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
        produit_id: null,
        produit: null,
        unitPrice: 0,
        totalPrice: 0,
      };
    } else {
      const produit = selectedOption.data;
      const newV1 = parseFloat(produit.L1) || updatedItems[index].v1 || 1;
      const newV2 = parseFloat(produit.L2) || updatedItems[index].v2 || 1;
      updatedItems[index] = {
        ...updatedItems[index],
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        v1: newV1,
        v2: newV2,
        unitPrice: parseFloat(produit.prix_vente) || 0,
        totalPrice: calculateItemTotal({
          quantity: updatedItems[index].quantity,
          v1: newV1,
          v2: newV2,
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
      v3: 1,
      unitPrice: 0,
      remise_ligne: 0,
      totalPrice: 0,
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
        text: "Êtes-vous sûr de vouloir supprimer cet article du bon livraison?",
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

  // Initialize form data when invoice changes
  useEffect(() => {
    if (invoice) {
      console.log("Initializing form with Bon Livraison:", invoice);

      // Map lignes to items format expected by the UI
      const mappedItems = invoice.lignes
        ? invoice.lignes.map((ligne, index) => ({
            id: ligne.id || `temp-${index}`,
            // IMPORTANT: Store the entire produit object
            produit: ligne.produit || null,
            code: ligne.produit?.reference || ligne.reference || "",
            designation: ligne.produit?.designation || ligne.designation || "",
            quantity: parseFloat(ligne.quantite) || 0,
            v1: parseFloat(ligne.v1) || 1,
            v2: parseFloat(ligne.v2) || 1,
            v3: parseFloat(ligne.v3) || 1,
            unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            remise_ligne: parseFloat(ligne.remise_ligne) || 0,
            totalPrice: calculateItemTotal({
              quantity: parseFloat(ligne.quantite) || 0,
              v1: parseFloat(ligne.v1) || 1,
              v2: parseFloat(ligne.v2) || 1,
              unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            }),
            produit_id: ligne.produit_id,
            bon_livraison_id: ligne.bon_livraison_id,
            deliveredQuantity: parseFloat(ligne.deliveredQuantity) || 0,
          }))
        : [];

      // Map advancements from API
      const mappedAdvancements = invoice.advancements
        ? invoice.advancements.map((adv) => ({
            id: adv.id,
            amount: parseFloat(adv.amount) || parseFloat(adv.advancement) || 0,
            paymentDate: adv.paymentDate
              ? new Date(adv.paymentDate)
              : new Date(),
            paymentMethod: adv.paymentMethod || adv.payment_type || "espece",
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
        items: mappedItems,
        advancements: mappedAdvancements,
        // Additional fields from API
        receiverName: invoice.receiverName || "",
        receiverSignature: invoice.receiverSignature || "",
        preparedBy: invoice.preparedBy || "",
        deliveredBy: invoice.deliveredBy || "",
      });

      // Set selected client ID from invoice
      if (invoice.client_id) {
        setSelectedClientId(invoice.client_id);
      }
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

  // Calculate Metre Lin for an item: (v1/100 + v2/100) * 2 * qty (using rounded values)
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

  // Calculate Surface for an item: qty * (v1/100) * (v2/100) using rounded values
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

  const isSimpleCalculation = (item) => {
    const v1 = parseFloat(item.v1) || 1;
    const v2 = parseFloat(item.v2) || 1;
    return v1 === 1 && v2 === 1;
  };

  // Calculate all totals
  const subTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );

  // Calculate sum of all Metre Lin
  const totalMetreLin = formData.items.reduce(
    (sum, item) => sum + calculateMetreLin(item),
    0,
  );

  // Calculate sum of all Surface
  const totalSurface = formData.items.reduce(
    (sum, item) => sum + calculateSurface(item),
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
  const totalAfterDiscount = Math.max(0, subTotal - discount);

  // Calculate total advancement from advancements array
  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0,
  );

  const remainingAmount = Math.max(0, totalAfterDiscount - totalAdvancement);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStatusChange = (newStatus) => {
    handleInputChange("status", newStatus);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: ["articleName", "designation"].includes(field)
        ? value
        : parseFloat(value) || 0,
    };

    // Recalculate total price when dimensions change
    if (
      ["quantity", "v1", "v2", "v3", "unitPrice", "remise_ligne"].includes(
        field,
      )
    ) {
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
      topTost("La Bon Livraison doit avoir au moins un article", "error");
      return;
    }

    // Validate each item has required fields

    // Validate advancements don't exceed total
    if (totalAdvancement > totalAfterDiscount) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total",
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
      // Prepare the data for backend - match the API structure
      const updateData = {
        deliveryNumber: invoice.deliveryNumber,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        clientId: selectedClientId || null,
        issueDate: formData.issueDate.toISOString(),
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        paymentType: formData.paymentType,
        remainingAmount: remainingAmount,
        receiverName: formData.receiverName || "",
        receiverSignature: formData.receiverSignature || "",
        // Map items back to lignes format for backend
        items: formData.items.map((item) => ({
          id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
          produit_id: item.produit_id,
          quantite: item.quantity?.toString() || "1",
          v1: item.v1?.toString() || "1",
          v2: item.v2?.toString() || "1",
          v3: item.v3?.toString() || "1",
          prix_unitaire: item.unitPrice?.toString() || "0",
          total_ligne: item.totalPrice?.toString() || "0",
          remise_ligne: item.remise_ligne?.toString() || "0",
          designation: item.designation || item.articleName || null,
        })),
        advancements: formData.advancements
          .filter(adv => adv.amount > 0) // Only send advancements with amount > 0
          .map((adv) => ({
            id: typeof adv.id === 'number' && adv.id > 1000000000000 ? undefined : adv.id,
            amount: parseFloat(adv.amount) || 0,
            paymentDate: adv.paymentDate instanceof Date ? adv.paymentDate.toISOString() : new Date(adv.paymentDate).toISOString(),
            paymentMethod: adv.paymentMethod || "espece",
            reference: adv.reference || "",
            notes: adv.notes || "",
          })),
      };

      console.log("Sending update data to backend:", updateData);

      const response = await axios.put(
        `${config_url}/api/bonlivraisons/${invoice.id}`,
        updateData,
      );

      console.log("Update response from backend:", response.data);

      topTost("Bon Livraison mise à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate({
          ...(response.data.bonLivraison || response.data),
          total: totalAfterDiscount,
        });
      }

      toggle();
    } catch (error) {
      console.error("Error updating delivery note:", error);
      console.error("Error response data:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Erreur lors de la mise à jour de la Bon Livraison. Veuillez réessayer.";
      topTost(errorMessage, "error");
      setStatusKey((prev) => prev + 1);
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

  const handlePrint = () => {
    if (!invoice) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);
    const totalText = totalToFrenchText(totalAfterDiscount);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    console.log("Formdata Bon Livr Indos : " + JSON.stringify(formData.items));

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${invoice.deliveryNumber}</title>
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
      <p><strong>N° BL:</strong> ${invoice.deliveryNumber}</p>
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
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${formData.items
        .map((item) => {
          const simple =
            (parseFloat(item.v1) || 1) === 1 &&
            (parseFloat(item.v2) || 1) === 1;
          return `
        <tr>
          <td>${item.produit?.reference || item.code || "-"}</td>
          <td>${item.produit?.designation || "-"}</td>
          <td>${parseFloat(item.quantity).toFixed(2)}</td>
          <td>${(parseFloat(item.v1) || 1) === 1 ? "-" : parseFloat(item.v1).toFixed(2)}</td>
          <td>${(parseFloat(item.v2) || 1) === 1 ? "-" : parseFloat(item.v2).toFixed(2)}</td>
          <td>${simple ? "-" : ((roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100 + roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * 2 * (parseFloat(item.quantity) || 0)).toFixed(2)}</td>
          <td>${simple ? "-" : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100)).toFixed(4)}</td>
          <td>${simple ? ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2) : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} Dh</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
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

  // Print for Client - without company internal info
  const handlePrintClient = () => {
    if (!invoice) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);
    const totalText = totalToFrenchText(totalAfterDiscount);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${invoice.deliveryNumber}</title>
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
      <p><strong>N° BL:</strong> ${invoice.deliveryNumber}</p>
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
          return `
        <tr>
          <td>${item.produit?.reference || item.code || "-"}</td>
          <td>${item.produit?.designation || "-"}</td>
          <td>${parseFloat(item.quantity).toFixed(2)}</td>
          <td>${(parseFloat(item.v1) || 1) === 1 ? "-" : parseFloat(item.v1).toFixed(2)}</td>
          <td>${(parseFloat(item.v2) || 1) === 1 ? "-" : parseFloat(item.v2).toFixed(2)}</td>
          <td>${simple ? "-" : ((roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100 + roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * 2 * (parseFloat(item.quantity) || 0)).toFixed(2)}</td>
          <td>${simple ? "-" : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100)).toFixed(4)}</td>
          <td>${parseFloat(item.unitPrice).toFixed(2)} Dh</td>
          <td>${simple ? ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2) : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} Dh</td>
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
      const pdfContainer = document.createElement("div");
      pdfContainer.id = "pdf-container";
      pdfContainer.style.width = "210mm";
      pdfContainer.style.minHeight = "297mm";
      pdfContainer.style.padding = "15mm 20mm 40mm 20mm"; // extra bottom padding for footer
      pdfContainer.style.background = "white";
      pdfContainer.style.color = "#000";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "11px";
      pdfContainer.style.lineHeight = "1.5";
      pdfContainer.style.position = "relative";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";

      const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("fr-FR");
      };

      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">BON LIVRAISON</h1>
        <h3 style="margin:5px 0;">STE. RACHIGLASS S.A.R.L. A.U</h3>
        <p style="margin:2px 0;">VENTE TOUS TYPE DE VERRE — Import / Export</p>
        <p style="font-size:10px; margin:2px 0;">Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <p style="margin:2px 0;"><strong>Sté RachiGlass S.A.R.L A.U</strong></p>
          <p style="margin:2px 0;">VENTE TOUS TYPE DE VERRE — Import / Export</p>
          <p style="margin:2px 0;">Tél: +212 607-150550 / +212 658-527241 / +212 609-685211</p>
          <p style="margin:2px 0;">Email: ibaghatrachid83@gmail.com</p>
          <p style="margin:2px 0;">TP: 56780736 — RC: 24001 — IF: 52433058 — CNSS: 2973747</p>
          <p style="margin:2px 0;">ICE: 003013206000054</p>
        </div>
        <div style="text-align:right;">
          <h4 style="margin-bottom:5px;">Bon Livraison</h4>
          <p style="margin:2px 0;"><strong>N°:</strong> ${invoice.deliveryNumber}</p>
          <p style="margin:2px 0;"><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <p style="margin:2px 0;"><strong>Client:</strong> ${formData.customerName}</p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Article</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qty</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Long</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Larg</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Mtre Lin.</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Surface</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map((item, i) => {
              const simple =
                (parseFloat(item.v1) || 1) === 1 &&
                (parseFloat(item.v2) || 1) === 1;
              return `
              <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
                <td style="border:1px solid #ddd; padding:5px;">${item.produit?.reference || item.code || "-"}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.quantity}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.v1}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${item.v2}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${simple ? "-" : ((roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100 + roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * 2 * (parseFloat(item.quantity) || 0)).toFixed(2)}</td>
                <td style="border:1px solid #ddd; text-align:center; padding:5px;">${simple ? "-" : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100)).toFixed(4)}</td>
                <td style="border:1px solid #ddd; text-align:right; padding:5px;">${simple ? ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2) : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} Dh</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p style="margin:2px 0;"><strong>Total après remise:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
        <p style="margin:2px 0;"><strong>Total Mètre Lin:</strong> ${totalMetreLin.toFixed(2)} ML</p>
        <p style="margin:2px 0;"><strong>Total Surface:</strong> ${totalSurface.toFixed(4)} m²</p>
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

      pdf.save(`Bon Livraison-${invoice.deliveryNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  // PDF for Client - without company internal info
  const generatePdfClient = async () => {
    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.style.width = "210mm";
      pdfContainer.style.minHeight = "297mm";
      pdfContainer.style.padding = "15mm 20mm 40mm 20mm";
      pdfContainer.style.background = "white";
      pdfContainer.style.color = "#000";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "11px";
      pdfContainer.style.lineHeight = "1.5";
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";

      const creationDateFormatted = formatDateWithTime(formData.issueDate);

      pdfContainer.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
          <h2 style="margin:0;">BON DE LIVRAISON</h2>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div>
            <p><strong>Client:</strong> ${formData.customerName}</p>
            <p><strong>Tél:</strong> ${formData.customerPhone || "-"}</p>
          </div>
          <div style="text-align:right;">
            <p><strong>N° BL:</strong> ${invoice.deliveryNumber}</p>
            <p><strong>Date:</strong> ${creationDateFormatted}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:15px 0; font-size:10px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="border:1px solid #ddd; padding:6px;">Code</th>
              <th style="border:1px solid #ddd; padding:6px;">Designation</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:center;">Qté</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:center;">Long.</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:center;">Larg.</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:center;">Mtre Lin.</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:center;">Surface</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:right;">Prix U.</th>
              <th style="border:1px solid #ddd; padding:6px; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${formData.items
              .map((item) => {
                const simple =
                  (parseFloat(item.v1) || 1) === 1 &&
                  (parseFloat(item.v2) || 1) === 1;
                return `
              <tr>
                <td style="border:1px solid #ddd; padding:6px;">${item.produit?.reference || item.code || "-"}</td>
                <td style="border:1px solid #ddd; padding:6px;">${item.produit?.designation || "-"}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${parseFloat(item.quantity).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${(parseFloat(item.v1) || 1) === 1 ? "-" : parseFloat(item.v1).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${(parseFloat(item.v2) || 1) === 1 ? "-" : parseFloat(item.v2).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${simple ? "-" : ((roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100 + roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * 2 * (parseFloat(item.quantity) || 0)).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${simple ? "-" : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100)).toFixed(4)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${parseFloat(item.unitPrice).toFixed(2)} Dh</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${simple ? ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2) : ((parseFloat(item.quantity) || 0) * (roundToNextMultipleOfThree(parseFloat(item.v1) || 0) / 100) * (roundToNextMultipleOfThree(parseFloat(item.v2) || 0) / 100) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} Dh</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>

        <div style="margin-top:20px; display:flex; flex-direction:column; align-items:flex-end;">
          <p><strong>Net à payer:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
          <p><strong>Total Mètre Lin:</strong> ${totalMetreLin.toFixed(2)} ML</p>
          <p><strong>Total Surface:</strong> ${totalSurface.toFixed(4)} m²</p>
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

      pdf.save(`Bon-Livraison-${invoice.deliveryNumber}-Client.pdf`);
      topTost("PDF client téléchargé avec succès!", "success");
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
        Bon Livraison #{invoice.deliveryNumber}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
      </ModalHeader>

      <ModalBody style={{ overflow: "visible" }}>
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
              <label className="form-label">Date Livraison</label>
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
                key={statusKey}
                className="form-control"
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
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
                    <th>Designation</th>
                    <th>Qty</th>
                    <th>Longueur</th>
                    <th>Largeur</th>
                    <th>Mtre Lin.</th>
                    <th>Surface</th>
                    <th>Prix/Unité</th>
                    <th>Total</th>
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
                            min="0.01"
                            step="0.01"
                          />
                        )}
                      </td>

                      {/* Largeur (v2) - Input */}
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

                      {/* Mtre Lin. - Calculated: (v1/100 + v2/100) * 2 * qty */}
                      <td className="align-middle text-center">
                        <span className="text-primary fw-bold">
                          {isSimpleCalculation(item)
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

                      {/* Surface - Calculated: qty * (v1/100) * (v2/100) */}
                      <td className="align-middle text-center">
                        <span className="text-info fw-bold">
                          {isSimpleCalculation(item)
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

                      {/* Total - Static display (calculated) */}
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
                          title="Supprimer"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>{" "}
          </div>

          {/* Summary Section */}
          <div className="col-12">
            <div className="bg-light p-3 rounded mt-3">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé de la Bon Livraison</h6>
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
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
                  <div className="d-flex justify-content-between">
                    <span>Sous-total:</span>
                    <span>{subTotal.toFixed(2)} Dh</span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise globale:</span>
                      <span>-{discount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total après remise:</span>
                    <span>{totalAfterDiscount.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total Avancement(s):</span>
                    <span>{totalAdvancement.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Reste à payer:</span>
                    <span>{remainingAmount.toFixed(2)} Dh</span>
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
        <Button onClick={handlePrintClient} color="outline-info">
          <FiPrinter className="me-2" />
          Imprimer Pour Client
        </Button>
        <button className="btn btn-success" onClick={generatePdfClient}>
          <FiDownload className="me-2" />
          PDF Client
        </button>
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

export default BonLivrDetailsModal;
