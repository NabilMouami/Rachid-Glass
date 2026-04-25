import React, { useState, useEffect, useRef } from "react";
import { FiInfo, FiUser, FiXCircle } from "react-icons/fi";
import DatePicker from "react-datepicker";
import useDatePicker from "@/hooks/useDatePicker";
import topTost from "@/utils/topTost";
import { useSelector } from "react-redux";

import axios from "axios";
import { config_url } from "@/utils/config";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { components } from "react-select";

import { FaCalendarAlt } from "react-icons/fa";
import { BsPlusCircle } from "react-icons/bs";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const previtems = [
  {
    id: 1,
    product: "",
    qty: 1,
    v1: 1, // Longueur - original value entered by user
    v2: 1, // Largeur - original value entered by user
    price_unit: 1, // Price per unit volume
    total: 1,
    productId: null,
  },
];

// Function to round to next multiple of 3 (for calculations only)
const roundToNextMultipleOfThree = (value) => {
  const numValue = parseFloat(value);

  // Handle values less than or equal to 3 - return 3 (minimum) instead of the raw value
  if (isNaN(numValue) || numValue < 3) {
    return 3;
  }

  // If value is already a multiple of 3, return it as is
  if (numValue % 3 === 0) {
    return numValue;
  }

  // Calculate the next multiple of 3
  const nextMultiple = Math.ceil(numValue / 3) * 3;
  return nextMultiple;
};

// Function to check if value needs rounding (for display purposes only)
const needsRounding = (value) => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return false;
  }

  // Round if has decimal part OR is not multiple of 3
  return numValue % 1 !== 0 || numValue % 3 !== 0;
};

// Get rounded value for an item field
const getRoundedValue = (item, field) => {
  if (field === "v1" || field === "v2") {
    return roundToNextMultipleOfThree(item[field]);
  }
  return item[field];
};

// Calculate total for an item
const calculateItemTotal = (item) => {
  const v1 = parseFloat(item.v1) || 0;
  const v2 = parseFloat(item.v2) || 0;
  const qty = parseFloat(item.qty) || 0;
  const price = parseFloat(item.price_unit) || 0;
  
  // If both v1 and v2 are 1, calculate as simple: qty * price
  if (v1 === 1 && v2 === 1) {
    return qty * price;
  }
  
  // Otherwise use the roundToNextMultipleOfThree formula
  const calcV1 = roundToNextMultipleOfThree(v1) / 100;
  const calcV2 = roundToNextMultipleOfThree(v2) / 100;
  return qty * calcV1 * calcV2 * price;
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

const BonLivrCreate = () => {
  const currentDateWithTime = new Date();
  const { startDate, setStartDate, renderFooter } =
    useDatePicker(currentDateWithTime);
  const [items, setItems] = useState(previtems);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("brouillon");
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [paymentType, setPaymentType] = useState("espece");
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState({}); // Track price alerts per item
  const selectRefs = useRef({});
  const navigate = useNavigate();

  // Handle Enter key - add new row below current item
  const handleAddRowBelow = (e, currentItemId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === currentItemId);
      if (currentIndex !== -1) {
        // Create new item after current
        const newItem = {
          id: `temp-${Date.now()}`,
          product: "",
          productId: null,
          qty: 1,
          v1: 1,
          v2: 1,
          price_unit: 1,
          total: 1,
        };
        const newItems = [...items];
        newItems.splice(currentIndex + 1, 0, newItem);
        setItems(newItems);
        
        // Focus on the new row's product select after render
        setTimeout(() => {
          const selectRef = selectRefs.current[newItem.id];
          if (selectRef) {
            selectRef.focus();
          }
        }, 100);
      }
    }
  };

  // Get current user from Redux
  const User = useSelector((state) => state.userInfo.User);

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
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
        topTost("Erreur lors du chargement des clients", "error");
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Fetch products on component mount
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
        topTost("Erreur lors du chargement des produits", "error");
      } finally {
        setLoadingProduits(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (!startDate) {
      setStartDate(new Date());
    }
  }, []);

  // Function to check if price is within allowed range
  const checkPriceRange = (produitData, price) => {
    if (!produitData) return { isValid: true, message: "" };

    const prixVenteMin = parseFloat(produitData.prix_vente_min);
    const prixVenteMax = parseFloat(produitData.prix_vente_max);

    if (prixVenteMin && prixVenteMax) {
      if (price < prixVenteMin) {
        return {
          isValid: false,
          message: `⚠️ Prix (${price} DH) inférieur au prix minimum (${prixVenteMin} DH)`,
        };
      }
      if (price > prixVenteMax) {
        return {
          isValid: false,
          message: `⚠️ Prix (${price} DH) supérieur au prix maximum (${prixVenteMax} DH)`,
        };
      }
    } else if (prixVenteMin && price < prixVenteMin) {
      return {
        isValid: false,
        message: `⚠️ Prix (${price} DH) inférieur au prix minimum (${prixVenteMin} DH)`,
      };
    } else if (prixVenteMax && price > prixVenteMax) {
      return {
        isValid: false,
        message: `⚠️ Prix (${price} DH) supérieur au prix maximum (${prixVenteMax} DH)`,
      };
    }

    return { isValid: true, message: "" };
  };

  const loadProduits = async (inputValue) => {
    // Si pas de recherche, retourner tous les produits
    if (!inputValue) {
      return products;
    }

    // Filtrer localement les produits existants
    const filtered = products.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const produit = option.data;
      return (
        produit.reference?.toLowerCase().includes(searchTerm) ||
        produit.designation?.toLowerCase().includes(searchTerm)
      );
    });

    // Si aucun résultat local, faire une recherche API
    if (filtered.length === 0 && inputValue.length >= 2) {
      try {
        const response = await axios.get(
          `${config_url}/api/produits/search?q=${inputValue}`,
        );

        const options = (response.data.produits || []).map((produit) => ({
          value: produit.id,
          label: `${produit.reference} - ${produit.designation}`,
          data: {
            ...produit,
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix: ${produit.prix_vente} DH)`,
          },
        }));

        return options;
      } catch (error) {
        console.error("Error searching produits:", error);
        return [];
      }
    }

    return filtered;
  };

  const addItem = () => {
    const newItem = {
      id: items.length + 1,
      product: "",
      qty: 1,
      v1: 1,
      v2: 1,
      price_unit: 1,
      total: 1,
      productId: null,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
      // Clean up price alerts
      const newAlerts = { ...priceAlerts };
      delete newAlerts[id];
      setPriceAlerts(newAlerts);
    }
  };

  // Handle product selection from AsyncSelect for a specific item
  const handleProduitSelect = (selectedOption, itemId) => {
    // Si selectedOption est null (clear), réinitialiser le produit
    if (!selectedOption) {
      const updatedItems = items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            product: "",
            productId: null,
            price_unit: 1,
          };

          // Recalculate total with default price using rounded dimensions
          updatedItem.total = calculateItemTotal(updatedItem);

          return updatedItem;
        }
        return item;
      });

      setItems(updatedItems);
      // Clear alert for this item
      setPriceAlerts((prev) => {
        const newAlerts = { ...prev };
        delete newAlerts[itemId];
        return newAlerts;
      });
      return;
    }

    const produitData = selectedOption.data;
    const price = produitData.prix_vente;

    // Check price range
    const priceCheck = checkPriceRange(produitData, price);

    if (!priceCheck.isValid) {
      setPriceAlerts((prev) => ({
        ...prev,
        [itemId]: priceCheck.message,
      }));
    } else {
      setPriceAlerts((prev) => {
        const newAlerts = { ...prev };
        delete newAlerts[itemId];
        return newAlerts;
      });
    }

    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          product: produitData.designation,
          productId: selectedOption.value,
          price_unit: price,
        };

        // Recalculate total with new price using rounded dimensions
        updatedItem.total = calculateItemTotal(updatedItem);

        return updatedItem;
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Helper to parse French decimal format (comma to period)
  const parseFrenchNumber = (value) => {
    if (!value) return 0;
    const processed = String(value).replace(",", ".");
    return parseFloat(processed) || 0;
  };

  const handleInputChange = (id, field, value) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const processedValue =
          field === "product" ? value : parseFrenchNumber(value);

        const updatedItem = {
          ...item,
          [field]: processedValue,
        };

        // If product field is manually changed, clear the productId
        if (field === "product") {
          updatedItem.productId = null;
        }

        // Calculate total when any of the relevant fields change
        // using rounded dimensions for v1 and v2 in the calculation
        if (["qty", "v1", "v2", "price_unit"].includes(field)) {
          updatedItem.total = calculateItemTotal(updatedItem);
        }

        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handlePriceUnitChange = (id, value) => {
    const price = parseFloat(value) || 0;

    // Find the product for this item
    const item = items.find((i) => i.id === id);
    const product = products.find((p) => p.value === item?.productId);

    if (product) {
      const priceCheck = checkPriceRange(product.data, price);
      if (!priceCheck.isValid) {
        setPriceAlerts((prev) => ({
          ...prev,
          [id]: priceCheck.message,
        }));
      } else {
        setPriceAlerts((prev) => {
          const newAlerts = { ...prev };
          delete newAlerts[id];
          return newAlerts;
        });
      }
    }

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = {
          ...item,
          price_unit: price,
        };
        // Calculate total using rounded dimensions
        updatedItem.total = calculateItemTotal(updatedItem);
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Handle client selection
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);

    const selectedClient = clients.find((c) => c.value == clientId);
    if (selectedClient) {
      setCustomerName(selectedClient.nom_complete);
      setCustomerPhone(selectedClient.telephone || "");
    }
  };

  // REMOVED: handleBlur function - no more rounding on blur
  // The user can now enter any value and it stays as entered

  // Calculate subtotal (before discount) using rounded dimensions for each item
  const subTotal = items.reduce((accumulator, currentValue) => {
    return accumulator + calculateItemTotal(currentValue);
  }, 0);

  // Calculate discount
  const calculateDiscount = () => {
    if (discountType === "percentage") {
      return (subTotal * discountAmount) / 100;
    } else {
      return discountAmount;
    }
  };

  const discount = calculateDiscount();

  // Calculate total after discount
  const totalAfterDiscount = subTotal - discount;

  // Final total (after discount)
  const total = Math.max(0, totalAfterDiscount).toFixed(2);

  // Update remaining amount when total or advancement changes
  useEffect(() => {
    const remaining = totalAfterDiscount - advancementPrice;
    setRemainingAmount(remaining > 0 ? remaining : 0);
  }, [totalAfterDiscount, advancementPrice]);

  const handleAdvancementChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAdvancementPrice(value);
  };

  const handleDiscountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setDiscountAmount(value);
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
    setDiscountAmount(0);
  };

  // Get maximum discount value based on type
  const getMaxDiscount = () => {
    if (discountType === "percentage") {
      return 100;
    } else {
      return subTotal;
    }
  };

  const resetForm = () => {
    setItems(previtems);
    setCustomerName("");
    setCustomerPhone("");
    setInvoiceNote("");
    setInvoiceStatus("brouillon");
    setAdvancementPrice(0);
    setRemainingAmount(0);
    setDiscountAmount(0);
    setDiscountType("fixed");
    setPaymentType("espece");
    setCreatedInvoiceId(null);
    setSelectedClientId("");
    setPriceAlerts({});
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    if (
      (invoiceStatus === "envoyée" ||
        invoiceStatus === "partiellement_payée") &&
      !customerPhone.trim()
    ) {
      topTost(
        "Le numéro de téléphone est requis pour envoyer la Bon Livraison",
        "error",
      );
      return;
    }

    if (advancementPrice > totalAfterDiscount) {
      topTost("L'acompte ne peut pas dépasser le montant total", "error");
      return;
    }

    if (discount > subTotal) {
      topTost("La remise ne peut pas dépasser le sous-total", "error");
      return;
    }

    const hasProducts = items.some((item) => item.product.trim() !== "");
    if (!hasProducts) {
      topTost("Veuillez ajouter au moins un produit", "error");
      return;
    }

    // Check for price alerts
    const hasAlerts = Object.keys(priceAlerts).length > 0;

    if (hasAlerts) {
      const alertMessages = Object.values(priceAlerts).join("\n");
      const result = await MySwal.fire({
        title: "Prix hors fourchette",
        html: `
          <p>Certains prix sont en dehors des fourchettes autorisées :</p>
          <div class="text-warning text-start mt-3 p-3 bg-light rounded">
            ${alertMessages
              .split("\n")
              .map(
                (msg) =>
                  `<div class="mb-2"><FiInfo class="me-2" />${msg}</div>`,
              )
              .join("")}
          </div>
          <p class="mt-3">Voulez-vous continuer quand même ?</p>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Oui, continuer",
        cancelButtonText: "Non, vérifier",
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const calculatedSubTotal = subTotal;
      const calculatedDiscount = discount;
      const calculatedTotal = calculatedSubTotal - calculatedDiscount;
      const calculatedRemaining = Math.max(
        0,
        calculatedTotal - advancementPrice,
      );

      // Prepare invoice data - match backend expectations
      const invoiceData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        issueDate: startDate,
        notes: invoiceNote,
        status: invoiceStatus,
        discountType: discountType,
        discountValue: parseFloat(discountAmount),
        paymentType: paymentType,

        // Send advancement as a single value (backend handles both)
        advancement: parseFloat(advancementPrice),

        // Send items with correct field names expected by backend
        // IMPORTANT: Send the ORIGINAL v1 and v2 values (not rounded)
        // but the backend will receive totalPrice already calculated with rounded values
        items: items.map((item) => ({
          productId: item.productId || null, // This will be mapped to produit_id in backend
          quantity: parseFloat(item.qty), // This will be mapped to quantite in backend
          v1: parseFloat(item.v1), // Original value entered by user (not rounded)
          v2: parseFloat(item.v2), // Original value entered by user (not rounded)
          unitPrice: parseFloat(item.price_unit), // This will be mapped to prix_unitaire
          totalPrice: parseFloat(calculateItemTotal(item)), // This uses rounded dimensions for calculation
          articleName: item.product, // For reference, but not used in BonLivraisonProduit
          deliveredQuantity: 0, // Add this if needed
          priceAlert: priceAlerts[item.id] || null, // Include price alert info
        })),
        // Send financial calculations
        subTotal: parseFloat(calculatedSubTotal),
        total: parseFloat(calculatedTotal),
        discountAmount: parseFloat(calculatedDiscount),
        remainingAmount: parseFloat(calculatedRemaining),

        // Client ID if available
        clientId: selectedClientId || null,

        // User who created/validated the BonLivraison
        preparedById: User?.id || null,
        preparedBy: User?.name || "",
        validatedById: User?.id || null,
        validatedBy: User?.name || "",

        // Optionally add advancements array if you want multiple advancements
        advancements:
          advancementPrice > 0
            ? [
                {
                  amount: parseFloat(advancementPrice),
                  paymentDate: new Date(),
                  paymentMethod: paymentType || "espece",
                  reference: "",
                  notes: "Avancement initial",
                },
              ]
            : [],
      };

      console.log("📦 Sending Bon Livraison data to backend:", invoiceData);

      // Send to backend
      const response = await axios.post(
        `${config_url}/api/bonlivraisons`,
        invoiceData,
      );

      console.log(response);
      if (response.data.success) {
        // Use 'bon' instead of 'bonLivraison' to match backend response
        const bon = response.data.bon;
        const totalAdvancements = response.data.totalAdvancements || 0;

        console.log("✅ Success data:", response.data); // For debugging

        // Show appropriate success message based on alerts
        if (hasAlerts) {
          topTost(
            "Bon Livraison créée avec des prix hors fourchette!",
            "warning",
          );
        } else {
          topTost("Bon Livraison créée avec succès!", "success");
        }

        // Store the created invoice ID
        if (bon && bon.id) {
          setCreatedInvoiceId(bon.id);
        }

        // Use setTimeout to ensure DOM is ready and avoid conflicts
        setTimeout(() => {
          MySwal.fire({
            title: hasAlerts ? "Succès avec alertes !" : "Succès !",
            icon: hasAlerts ? "warning" : "success",
            html: `
        <div style="text-align:left;font-size:14px">
          <p><strong>Numéro :</strong> ${bon.num_bon_livraison || "N/A"}</p>
          <p><strong>Montant TTC :</strong> ${bon.montant_ttc || 0} DH</p>
          <p><strong>Acomptes versés :</strong> ${totalAdvancements} DH</p>
          <p><strong>Montant restant :</strong> ${bon.montant_restant || 0} DH</p>
          <p><strong>Statut :</strong> ${bon.status || "N/A"}</p>
          ${hasAlerts ? '<p class="text-warning mt-2"><strong>⚠️ Attention:</strong> Des prix hors fourchette ont été validés</p>' : ""}
        </div>
      `,
            confirmButtonText: "Voir le bon",
            showCancelButton: true,
            cancelButtonText: "Nouveau bon",
            // Add these options to ensure it appears on top
            backdrop: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate(`/bon-livraisons/${bon.id}`);
            } else {
              resetForm();
            }
          });
        }, 100); // Small delay to ensure state updates are complete
      }
    } catch (error) {
      console.error("Error creating bonLivraison:", error);

      // Improved error handling
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);

        // Check for validation errors
        if (error.response.data.errors) {
          const errorMessages = error.response.data.errors.join(", ");
          topTost(`Erreurs de validation: ${errorMessages}`, "error");
        } else if (error.response.data.message) {
          topTost(error.response.data.message, "error");
        } else {
          topTost("Erreur lors de la création de la Bon Livraison", "error");
        }
      } else if (error.request) {
        console.error("No response received:", error.request);
        topTost("Pas de réponse du serveur", "error");
      } else {
        topTost("Erreur lors de la création de la Bon Livraison", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom ClearIndicator component for single-select
  const ClearIndicator = (props) => {
    const {
      innerProps: { ref, ...restInnerProps },
    } = props;
    return (
      <div
        {...restInnerProps}
        ref={ref}
        style={{
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FiXCircle size={16} color="#6c757d" />
      </div>
    );
  };

  const customOption = (props) => {
    const { data, innerRef, innerProps, isSelected, isFocused } = props;
    const produit = data.data;

    // Build price range info
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
        className={`p-2 cursor-pointer ${isSelected ? "bg-primary text-white" : ""} ${isFocused && !isSelected ? "bg-blue-50" : ""}`}
      >
        <div className="font-semibold">{data.label}</div>
        <div
          className={`text-sm ${isSelected ? "text-white" : "text-gray-600"}`}
        >
          Stock: {produit.qty} | Prix: {produit.prix_vente} DH{priceRangeInfo}
        </div>
        {produit.surface > 0 && (
          <div
            className={`text-xs ${isSelected ? "text-white" : "text-gray-500"}`}
          >
            Surface: {produit.surface} m²
          </div>
        )}
      </div>
    );
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="col-xl-12">
        <div className="card invoice-container">
          <div className="card-header">
            <h5>Creer Bon Livraison</h5>
          </div>
          <div className="card-body p-0">
            <div className="px-4 pt-4">
              <div className="d-md-flex align-items-center justify-content-between">
                <div className="d-md-flex align-items-center justify-content-end gap-4">
                  <div className="form-group mb-3 mb-md-0">
                    <label className="form-label fw-medium">
                      <FaCalendarAlt className="me-2" />
                      Date et Heure de création:
                    </label>
                    <div className="input-group date">
                      <span className="input-group-text bg-light">
                        <FaCalendarAlt className="text-muted" />
                      </span>
                      <DatePicker
                        placeholderText="Sélectionner date et heure..."
                        selected={startDate}
                        showPopperArrow={false}
                        onChange={(date) => setStartDate(date)}
                        className="form-control"
                        popperPlacement="bottom-start"
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                        timeCaption="Heure"
                        calendarContainer={({ children }) => (
                          <div className="bg-white react-datepicker shadow-sm">
                            {children}
                            {renderFooter("start")}
                          </div>
                        )}
                      />
                    </div>
                    {startDate && (
                      <small className="text-muted d-block mt-1">
                        {formatDateTime(startDate)}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="row mt-4">
                <div className="col-md-6">
                  <label className="form-label">
                    <FiUser className="me-2" />
                    Client <span className="text-danger">*</span>
                  </label>
                  <Select
                    options={clients}
                    className="react-select"
                    classNamePrefix="react-select"
                    placeholder="Sélectionner un client"
                    value={clients.find((c) => c.value === selectedClientId)}
                    onChange={(e) => handleClientSelect(e.value)}
                    isSearchable
                    required
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
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="customerPhone" className="form-label">
                      Téléphone Client: *
                      {["envoyée", "partiellement_payée"].includes(
                        invoiceStatus,
                      ) && <span className="text-danger"> (Requis)</span>}
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="customerPhone"
                      placeholder="06 XX XX XX XX ou +212 6 XX XX XX XX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required={["envoyée", "partiellement_payée"].includes(
                        invoiceStatus,
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Manual Customer Name */}
              <div className="row mt-3">
                <div className="col-md-12">
                  <div className="form-group">
                    <label htmlFor="customerName" className="form-label">
                      Nom Client: *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="customerName"
                      placeholder="Entrez Le Nom De Client"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Status, Payment Type, and Advancement */}
              <div className="row mt-3">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="invoiceStatus" className="form-label">
                      Statut de la Bon Livraison:
                    </label>
                    <select
                      className="form-control"
                      id="invoiceStatus"
                      value={invoiceStatus}
                      onChange={(e) => setInvoiceStatus(e.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="paymentType" className="form-label">
                      Type de Paiement:
                    </label>
                    <select
                      className="form-control"
                      id="paymentType"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                    >
                      {paymentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="advancementPrice" className="form-label">
                      Avancement (Dh):
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="advancementPrice"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={totalAfterDiscount}
                      value={advancementPrice}
                      onChange={handleAdvancementChange}
                    />
                    <small className="text-muted">
                      Maximum: {totalAfterDiscount.toFixed(2)} Dh
                    </small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="discountType" className="form-label">
                      Type de Remise:
                    </label>
                    <select
                      className="form-control"
                      id="discountType"
                      value={discountType}
                      onChange={handleDiscountTypeChange}
                    >
                      <option value="fixed">Montant Fixe (Dh)</option>
                      <option value="percentage">Pourcentage (%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Discount Input Section */}
              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="discountAmount" className="form-label">
                      {discountType === "percentage"
                        ? "Remise (%)"
                        : "Remise (Dh)"}
                      :
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="discountAmount"
                      placeholder={discountType === "percentage" ? "0" : "0.00"}
                      step={discountType === "percentage" ? "1" : "0.01"}
                      min="0"
                      max={getMaxDiscount()}
                      value={discountAmount}
                      onChange={handleDiscountChange}
                    />
                    <small className="text-muted">
                      {discountType === "percentage"
                        ? `Maximum: 100% (${subTotal.toFixed(2)} Dh)`
                        : `Maximum: ${subTotal.toFixed(2)} Dh`}
                    </small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Valeur de la Remise:</label>
                    <div className="p-2 bg-light rounded">
                      <p className="mb-0 fw-bold text-danger">
                        -{discount.toFixed(2)}{" "}
                        {discountType === "percentage" ? "%" : "Dh"}
                        {discountType === "percentage" && (
                          <span className="text-muted ms-2">
                            ({((discountAmount / 100) * subTotal).toFixed(2)}{" "}
                            Dh)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price alerts summary */}
              {Object.keys(priceAlerts).length > 0 && (
                <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                  <div className="d-flex align-items-center gap-2">
                    <FiInfo className="text-warning" size={20} />
                    <strong className="text-white">
                      Attention: {Object.keys(priceAlerts).length} article(s)
                      avec prix hors fourchette
                    </strong>
                  </div>
                  <ul className="mt-2 mb-0">
                    {Object.entries(priceAlerts).map(([itemId, message]) => {
                      const item = items.find((i) => i.id === parseInt(itemId));
                      return (
                        <li key={itemId} className="text-white">
                          Article {itemId}: {item?.product || "Produit"} -{" "}
                          {message}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <hr className="border-dashed" />
            <div className="px-4 clearfix proposal-table">
              <div className="mb-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold">Ajouter des éléments de Verre :</h6>
                  <span className="fs-12 text-muted">
                    Ajouter des éléments avec des dimensions à la Bon Livraison.
                    (Les calculs de prix utilisent les dimensions arrondies au
                    multiple de 3 supérieur, mais les valeurs originales saisies
                    sont conservées)
                  </span>
                </div>
                <div
                  className="avatar-text avatar-sm"
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  title="Total = Qty × Longueur (arrondie au multiple de 3) × Largeur (arrondie au multiple de 3) × Unit Price"
                >
                  <FiInfo />
                </div>
              </div>
              <div className="table-responsive">
                <table
                  className="table table-bordered overflow-hidden"
                  id="tab_logic"
                >
                  <thead>
                    <tr className="single-item">
                      <th className="text-center wd-50">#</th>
                      <th className="text-center wd-350">Nom d'Article</th>
                      <th className="text-center wd-80">Qty</th>
                      <th className="text-center wd-100">Longueur</th>
                      <th className="text-center wd-100">Largeur</th>
                      <th className="text-center wd-120">Prix/Unité</th>
                      <th className="text-center wd-120">Total</th>
                      <th className="text-center wd-100">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const selectedProduct = products.find(
                        (p) => p.value === item.productId,
                      );
                      const hasPriceAlert = priceAlerts[item.id];

                      // Calculate values divided by 100 and rounded to next multiple of 3
                      const calcV1 = roundToNextMultipleOfThree(item.v1) / 100;
                      const calcV2 = roundToNextMultipleOfThree(item.v2) / 100;

                      return (
                        <tr
                          key={item.id}
                          className={hasPriceAlert ? "table-warning" : ""}
                        >
                          <td className="text-center">{item.id}</td>
                          <td>
                            <div className="mb-2">
                              {loadingProduits ? (
                                <div className="text-center py-2">
                                  <div
                                    className="spinner-border spinner-border-sm text-primary"
                                    role="status"
                                  >
                                    <span className="visually-hidden">
                                      Chargement...
                                    </span>
                                  </div>
                                  <small className="d-block mt-1">
                                    Chargement des produits...
                                  </small>
                                </div>
                              ) : (
                                <>
                                  <AsyncSelect
                                    ref={(el) =>
                                      (selectRefs.current[item.id] = el)
                                    }
                                    cacheOptions
                                    loadOptions={loadProduits}
                                    defaultOptions={products}
                                    onChange={(selectedOption) =>
                                      handleProduitSelect(
                                        selectedOption,
                                        item.id,
                                      )
                                    }
                                    value={selectedProduct}
                                    placeholder="Rechercher un produit..."
                                    noOptionsMessage={({ inputValue }) =>
                                      !inputValue
                                        ? "Commencez à taper pour rechercher"
                                        : "Aucun produit trouvé"
                                    }
                                    loadingMessage={() => "Chargement..."}
                                    className="react-select"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    components={{
                                      Option: customOption,
                                      ClearIndicator: ClearIndicator,
                                    }}
                                    formatOptionLabel={(option) => (
                                      <div>
                                        <div className="fw-semibold">
                                          {option.label}
                                        </div>
                                        <div className="text-muted small">
                                          Stock: {option.data.qty} | Prix:{" "}
                                          {option.data.prix_vente} DH
                                        </div>
                                      </div>
                                    )}
                                    isClearable={true}
                                    isMulti={false}
                                    styles={{
                                      control: (base) => ({
                                        ...base,
                                        minHeight: "38px",
                                        borderColor: hasPriceAlert
                                          ? "#ffc107"
                                          : "#dee2e6",
                                        "&:hover": {
                                          borderColor: hasPriceAlert
                                            ? "#ffc107"
                                            : "#405189",
                                        },
                                      }),
                                      clearIndicator: (base) => ({
                                        ...base,
                                        padding: "4px",
                                        cursor: "pointer",
                                        "&:hover": {
                                          color: "#dc3545",
                                        },
                                      }),
                                      menu: (base) => ({
                                        ...base,
                                        zIndex: 9999,
                                      }),
                                    }}
                                  />
                                  {hasPriceAlert && (
                                    <small className="text-warning d-block mt-1">
                                      <FiInfo size={12} className="me-1" />
                                      {priceAlerts[item.id]}
                                    </small>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              name="qty"
                              placeholder="Qty"
                              className="form-control"
                              style={{ minWidth: "60px", width: "80px" }}
                              step="1"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "qty",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="v1"
                              placeholder="Longueur"
                              className="form-control"
                              style={{ minWidth: "80px", width: "100px" }}
                              step="any"
                              min="0.01"
                              value={item.v1}
                              onChange={(e) =>
                                handleInputChange(item.id, "v1", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="v2"
                              placeholder="Largeur"
                              className="form-control"
                              style={{ minWidth: "80px", width: "100px" }}
                              step="any"
                              min="0.01"
                              value={item.v2}
                              onChange={(e) =>
                                handleInputChange(item.id, "v2", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              name="price_unit"
                              placeholder="Prix/Unit"
                              className={`form-control ${hasPriceAlert ? "border-warning" : ""}`}
                              style={{ minWidth: "100px", width: "120px" }}
                              step="any"
                              min="0.01"
                              value={item.price_unit}
                              onChange={(e) =>
                                handlePriceUnitChange(item.id, e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              readOnly
                              value={typeof item.total === 'number' ? item.total.toFixed(2) : parseFloat(item.total || 0).toFixed(2)}
                            />
                            <small className="text-muted d-block">
                              {item.qty} × {calcV1} × {calcV2} × {item.price_unit}
                            </small>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() => {
                                const newItem = {
                                  id: `temp-${Date.now()}`,
                                  product: item.product,
                                  productId: item.productId,
                                  qty: 1,
                                  v1: item.v1 || 1,
                                  v2: item.v2 || 1,
                                  price_unit: item.price_unit || 1,
                                  total: parseFloat(item.price_unit) || 1,
                                };
                                const currentIndex = items.findIndex(i => i.id === item.id);
                                const newItems = [...items];
                                newItems.splice(currentIndex + 1, 0, newItem);
                                setItems(newItems);
                              }}
                              title="Ajouter même produit"
                            >
                              +
                            </button>
                            {items.length > 1 && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => removeItem(item.id)}
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  className="btn btn-sm btn-primary d-flex justify-content-end gap-2"
                  onClick={addItem}
                >
                  Ajouter Nouveau Article
                  <BsPlusCircle size={15} />
                </button>
              </div>
            </div>

            {/* Summary Section */}
            <div className="px-4 py-3 bg-light mt-4">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Client:</label>
                    <p className="fw-bold">{customerName || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone:</label>
                    <p className="fw-bold">{customerPhone || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Statut:</label>
                    <p className="fw-bold">
                      {statusOptions.find((opt) => opt.value === invoiceStatus)
                        ?.label || "Brouillon"}
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type de Paiement:</label>
                    <p className="fw-bold">
                      {paymentTypeOptions.find(
                        (opt) => opt.value === paymentType,
                      )?.label || "Non spécifié"}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <div className="row justify-content-end">
                    <div className="col-auto">
                      <p className="mb-1">Sous-total:</p>
                      <p className="mb-1 text-danger">Remise:</p>
                      <p className="mb-1 fw-bold">Total après remise:</p>
                      <p className="mb-1">Avancement:</p>
                      <p className="mb-1 fw-bold border-top pt-1">
                        Reste à payer:
                      </p>
                    </div>
                    <div className="col-auto text-end">
                      <p className="mb-1">{subTotal.toFixed(2)} Dh</p>
                      <p className="mb-1 text-danger">
                        -{discount.toFixed(2)} Dh
                      </p>
                      <p className="mb-1 fw-bold">
                        {totalAfterDiscount.toFixed(2)} Dh
                      </p>
                      <p className="mb-1">{advancementPrice.toFixed(2)} Dh</p>
                      <p className="mb-1 fw-bold border-top pt-1">
                        {remainingAmount.toFixed(2)} Dh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dashed" />
            <div className="px-4 pb-4">
              <div className="form-group">
                <label htmlFor="InvoiceNote" className="form-label">
                  Description De Bon Livraison:
                </label>
                <textarea
                  rows={6}
                  className="form-control"
                  id="InvoiceNote"
                  placeholder="It was a pleasure working with you and your team. We hope you will keep us in mind for future metal construction projects. Thank You!"
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                {createdInvoiceId && (
                  <>
                    <button className="btn btn-secondary" onClick={resetForm}>
                      Nouvelle Bon Livraison
                    </button>
                  </>
                )}
                <button
                  className={`btn ${Object.keys(priceAlerts).length > 0 ? "btn-warning" : "btn-primary"}`}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Création en cours..."
                  ) : Object.keys(priceAlerts).length > 0 ? (
                    <>
                      <FiInfo className="me-2" />
                      Créer avec alertes
                    </>
                  ) : (
                    "Créer Bon Livraison"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BonLivrCreate;
