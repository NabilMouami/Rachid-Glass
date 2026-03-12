import React, { useState, useEffect, useRef } from "react";
import { FiInfo, FiUser, FiXCircle } from "react-icons/fi";
import DatePicker from "react-datepicker";
import useDatePicker from "@/hooks/useDatePicker";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { FaCalendarAlt } from "react-icons/fa";
import { BsPlusCircle } from "react-icons/bs";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const MySwal = withReactContent(Swal);

const previtems = [
  {
    id: 1,
    product: "",
    qty: 1,
    v1: 1, // Longueur - original value
    v2: 1, // Largeur - original value
    price_unit: 1, // Prix unitaire au m²
    total: 1,
    productId: null,
  },
];

// ────────────────────────────────────────────────
// Rounding logic (for calculations only)
const roundToNextMultipleOfThree = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) return 1;
  if (numValue % 3 === 0) return numValue;
  return Math.ceil(numValue / 3) * 3;
};

const needsRounding = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return false;
  return numValue % 1 !== 0 || numValue % 3 !== 0;
};

// Calculate total for an item using rounded dimensions
const calculateItemTotal = (item) => {
  const roundedV1 = roundToNextMultipleOfThree(item.v1);
  const roundedV2 = roundToNextMultipleOfThree(item.v2);
  return item.qty * roundedV1 * roundedV2 * item.price_unit;
};

// ────────────────────────────────────────────────
// Devis-specific status options
const devisStatusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_attente", label: "En attente de validation" },
  { value: "validée", label: "Validée" },
  { value: "acceptée", label: "Acceptée" },
  { value: "refusée", label: "Refusée" },
  { value: "annulée", label: "Annulée" },
];

// ────────────────────────────────────────────────
const DevisCreate = () => {
  const currentDateWithTime = new Date();
  const { startDate, setStartDate, renderFooter } =
    useDatePicker(currentDateWithTime);
  const User = useSelector((state) => state.userInfo.User);

  const [items, setItems] = useState(previtems);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [devisNote, setDevisNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devisStatus, setDevisStatus] = useState("brouillon");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [createdDevisId, setCreatedDevisId] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState({}); // Track price alerts per item
  const navigate = useNavigate();

  // Fetch clients
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
        topTost("Erreur chargement clients", "error");
      } finally {
        setIsLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!startDate) {
      setStartDate(new Date());
    }
  }, []);

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
        topTost("Erreur chargement produits", "error");
      } finally {
        setLoadingProduits(false);
      }
    };
    fetchProducts();
  }, []);

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

  const addItem = () => {
    setItems([
      ...items,
      {
        id: items.length + 1,
        product: "",
        qty: 1,
        v1: 1,
        v2: 1,
        price_unit: 1,
        total: 1,
        productId: null,
      },
    ]);
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

  const handleProduitSelect = (selectedOption, itemId) => {
    if (!selectedOption) {
      setItems(
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                product: "",
                productId: null,
                price_unit: 1,
                total: calculateItemTotal({
                  ...item,
                  price_unit: 1,
                }),
              }
            : item,
        ),
      );
      // Clear alert for this item
      setPriceAlerts((prev) => {
        const newAlerts = { ...prev };
        delete newAlerts[itemId];
        return newAlerts;
      });
      return;
    }

    const data = selectedOption.data;
    const price = data.prix_vente;

    // Check price range
    const priceCheck = checkPriceRange(data, price);

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

    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              product: data.designation,
              productId: selectedOption.value,
              price_unit: price,
              total: calculateItemTotal({
                ...item,
                price_unit: price,
              }),
            }
          : item,
      ),
    );
  };

  const handleInputChange = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const processed = field === "product" ? value : parseFloat(value) || 0;
        const updated = { ...item, [field]: processed };

        if (field === "product") updated.productId = null;

        // Calculate total using rounded dimensions
        if (["qty", "v1", "v2", "price_unit"].includes(field)) {
          updated.total = calculateItemTotal(updated);
        }

        return updated;
      }),
    );
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

    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              price_unit: price,
              total: calculateItemTotal({ ...item, price_unit: price }),
            }
          : item,
      ),
    );
  };

  // REMOVED: handleBlur function - no more rounding on blur
  // The user can now enter any value and it stays as entered

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.value === clientId);
    if (client) {
      setCustomerName(client.nom_complete);
      setCustomerPhone(client.telephone || "");
    }
  };

  // Calculations using rounded dimensions
  const subTotal = items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );
  const discount =
    discountType === "percentage"
      ? (subTotal * discountAmount) / 100
      : discountAmount;
  const total = Math.max(0, subTotal - discount);

  const handleDiscountChange = (e) =>
    setDiscountAmount(parseFloat(e.target.value) || 0);
  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
    setDiscountAmount(0);
  };

  const getMaxDiscount = () => (discountType === "percentage" ? 100 : subTotal);

  const resetForm = () => {
    setItems(previtems);
    setCustomerName("");
    setCustomerPhone("");
    setDevisNote("");
    setDevisStatus("brouillon");
    setDiscountAmount(0);
    setDiscountType("fixed");
    setSelectedClientId("");
    setCreatedDevisId(null);
    setPriceAlerts({});
    setStartDate(new Date());
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      topTost("Nom du client requis", "error");
      return;
    }

    if (items.every((i) => !i.product.trim())) {
      topTost("Ajoutez au moins un article", "error");
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
              (msg) => `<div class="mb-2"><FiInfo class="me-2" />${msg}</div>`,
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
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        issueDate: startDate,
        notes: devisNote,
        status: devisStatus,
        discountType,
        discountValue: parseFloat(discountAmount),
        items: items.map((item) => ({
          productId: item.productId || null,
          quantity: parseFloat(item.qty),
          v1: parseFloat(item.v1), // Original value (not rounded)
          v2: parseFloat(item.v2), // Original value (not rounded)
          unitPrice: parseFloat(item.price_unit),
          totalPrice: parseFloat(calculateItemTotal(item)), // This uses rounded dimensions
          articleName: item.product,
          priceAlert: priceAlerts[item.id] || null, // Include price alert info
        })),
        subTotal: parseFloat(subTotal),
        discountAmount: parseFloat(discount),
        total: parseFloat(total),
        clientId: selectedClientId || null,
        preparedBy: User?.name || null, // Add this if you have User from Redux
      };

      console.log("📦 Sending Devis data to backend:", payload);

      const response = await axios.post(`${config_url}/api/devis`, payload);

      // Check response structure - backend returns { message, devis }
      if (response.data && response.data.devis) {
        const devis = response.data.devis;

        console.log("✅ Success data:", response.data);
        console.log("✅ Devis created:", devis);

        if (devis && devis.id) {
          setCreatedDevisId(devis.id);
        }

        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          MySwal.fire({
            title: hasAlerts ? "Succès avec alertes !" : "Succès !",
            icon: hasAlerts ? "warning" : "success",
            html: `
            <div style="text-align:left;font-size:14px">
              <p><strong>Numéro Devis :</strong> ${devis.devisNumber || devisNumber || "N/A"}</p>
              <p><strong>Date :</strong> ${new Date(startDate).toLocaleString(
                "fr-FR",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}</p>
              <p><strong>Client :</strong> ${customerName}</p>
              <p><strong>Téléphone :</strong> ${customerPhone || "Non renseigné"}</p>
              <p><strong>Nombre d'articles :</strong> ${items.length}</p>
              <p><strong>Sous-total :</strong> ${subTotal.toFixed(2)} DH</p>
              <p><strong>Remise :</strong> -${discount.toFixed(2)} DH</p>
              <p><strong>Total TTC :</strong> ${total.toFixed(2)} DH</p>
              <p><strong>Statut :</strong> ${devisStatusOptions.find((opt) => opt.value === devisStatus)?.label || "N/A"}</p>
              ${hasAlerts ? '<p class="text-warning mt-2"><strong>⚠️ Attention:</strong> Des prix hors fourchette ont été validés</p>' : ""}
            </div>
          `,
            confirmButtonText: "Voir le devis",
            showCancelButton: true,
            cancelButtonText: "Nouveau devis",
            backdrop: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate(`/devis/${devis.id}`);
            } else {
              resetForm();
            }
          });
        }, 100);
      } else {
        // Handle unexpected response structure
        console.error("Unexpected response structure:", response.data);
        topTost("Réponse du serveur inattendue", "error");
      }
    } catch (err) {
      console.error("Error creating devis:", err);

      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);

        if (err.response.data.errors) {
          const errorMessages = err.response.data.errors.join(", ");
          topTost(`Erreurs de validation: ${errorMessages}`, "error");
        } else if (err.response.data.message) {
          topTost(err.response.data.message, "error");
        } else {
          topTost("Erreur lors de la création du devis", "error");
        }
      } else if (err.request) {
        console.error("No response received:", err.request);
        topTost("Pas de réponse du serveur", "error");
      } else {
        topTost("Erreur lors de la création du devis", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom components for react-select (same as yours)
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
    <div className="col-xl-12">
      <div className="card invoice-container">
        <div className="card-header">
          <h5>Créer Devis</h5>
        </div>

        <div className="card-body p-0">
          <div className="px-4 pt-4">
            {/* Date + Client */}
            <div className="d-md-flex align-items-center justify-content-between mb-4">
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

            <div className="row">
              <div className="col-md-6">
                <label className="form-label">
                  <FiUser className="me-2" />
                  Client <span className="text-danger">*</span>
                </label>
                <Select
                  options={clients}
                  value={clients.find((c) => c.value === selectedClientId)}
                  onChange={(e) => handleClientSelect(e.value)}
                  placeholder="Sélectionner un client..."
                  isSearchable
                  filterOption={(opt, input) =>
                    !input ||
                    opt.data.searchText.includes(input.toLowerCase().trim())
                  }
                  className="react-select"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "45px",
                      borderColor: "#dee2e6",
                    }),
                  }}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Téléphone Client</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="06 XX XX XX XX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <label className="form-label">Nom Client *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nom complet du client"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Status + Discount type */}
            <div className="row mt-4">
              <div className="col-md-4">
                <label className="form-label">Statut du Devis</label>
                <select
                  className="form-control"
                  value={devisStatus}
                  onChange={(e) => setDevisStatus(e.target.value)}
                >
                  {devisStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Type de remise</label>
                <select
                  className="form-control"
                  value={discountType}
                  onChange={handleDiscountTypeChange}
                >
                  <option value="fixed">Montant fixe (DH)</option>
                  <option value="percentage">Pourcentage (%)</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  {discountType === "percentage" ? "Remise (%)" : "Remise (DH)"}
                </label>
                <input
                  type="number"
                  className="form-control"
                  step={discountType === "percentage" ? 1 : 0.01}
                  min="0"
                  max={getMaxDiscount()}
                  value={discountAmount}
                  onChange={handleDiscountChange}
                />
                <small className="text-muted">
                  Max:{" "}
                  {discountType === "percentage"
                    ? "100%"
                    : subTotal.toFixed(2) + " DH"}
                </small>
              </div>
            </div>

            {/* Discount value display */}
            <div className="mt-2 p-2 bg-light rounded">
              <strong>Remise appliquée : </strong>
              <span className="text-danger">
                -{discount.toFixed(2)} DH
                {discountType === "percentage" && (
                  <span className="text-muted ms-2">
                    ({((discountAmount / 100) * subTotal).toFixed(2)} DH)
                  </span>
                )}
              </span>
            </div>

            {/* Price alerts summary */}
            {Object.keys(priceAlerts).length > 0 && (
              <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                <div className="d-flex align-items-center gap-2">
                  <FiInfo className="text-warning" size={20} />
                  <strong className="text-white">
                    Attention: {Object.keys(priceAlerts).length} article(s) avec
                    prix hors fourchette
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

          <hr className="border-dashed my-4" />

          {/* Items Table */}
          <div className="px-4 proposal-table">
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold">Articles / Verre</h6>
                <small className="text-muted">
                  (Les totaux sont calculés avec les dimensions arrondies au
                  multiple de 3 supérieur)
                </small>
              </div>
              <button
                className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                onClick={addItem}
              >
                Ajouter article <BsPlusCircle />
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th className="text-center">#</th>
                    <th className="text-center">Article</th>
                    <th className="text-center">Qté</th>
                    <th className="text-center">Longueur (cm)</th>
                    <th className="text-center">Largeur (cm)</th>
                    <th className="text-center">Prix m²</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const selected = products.find(
                      (p) => p.value === item.productId,
                    );
                    const hasPriceAlert = priceAlerts[item.id];

                    // Calculate rounded values for display
                    const roundedV1 = roundToNextMultipleOfThree(item.v1);
                    const roundedV2 = roundToNextMultipleOfThree(item.v2);
                    const needsRoundingV1 = needsRounding(item.v1);
                    const needsRoundingV2 = needsRounding(item.v2);

                    return (
                      <tr
                        key={item.id}
                        className={hasPriceAlert ? "table-warning" : ""}
                      >
                        <td className="text-center">{item.id}</td>
                        <td>
                          {loadingProduits ? (
                            <div className="text-center py-3">
                              Chargement...
                            </div>
                          ) : (
                            <>
                              <AsyncSelect
                                cacheOptions
                                loadOptions={loadProduits}
                                defaultOptions={products}
                                value={selected}
                                onChange={(opt) =>
                                  handleProduitSelect(opt, item.id)
                                }
                                placeholder="Rechercher produit..."
                                isClearable
                                components={{
                                  Option: customOption,
                                  ClearIndicator,
                                }}
                                menuPortalTarget={document.body}
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: "38px",
                                    borderColor: hasPriceAlert
                                      ? "#ffc107"
                                      : base.borderColor,
                                  }),
                                  menu: (base) => ({ ...base, zIndex: 9999 }),
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
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleInputChange(item.id, "qty", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            className="form-control"
                            value={item.v1}
                            onChange={(e) =>
                              handleInputChange(item.id, "v1", e.target.value)
                            }
                            // Removed onBlur handler
                          />
                          {needsRoundingV1 && (
                            <small className="text-muted d-block">
                              Utilisé: {roundedV1}
                            </small>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            className="form-control"
                            value={item.v2}
                            onChange={(e) =>
                              handleInputChange(item.id, "v2", e.target.value)
                            }
                            // Removed onBlur handler
                          />
                          {needsRoundingV2 && (
                            <small className="text-muted d-block">
                              Utilisé: {roundedV2}
                            </small>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className={`form-control ${hasPriceAlert ? "border-warning" : ""}`}
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
                            value={item.total.toFixed(2)}
                          />
                          <small className="text-muted d-block">
                            {item.qty} × {roundedV1} × {roundedV2} ×{" "}
                            {item.price_unit}
                          </small>
                        </td>
                        <td className="text-center">
                          {items.length > 1 && (
                            <button
                              className="btn btn-sm btn-outline-danger"
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
          </div>

          {/* Summary */}
          <div className="px-4 py-4 bg-light mt-4">
            <div className="row">
              <div className="col-md-6">
                <h6>Client</h6>
                <p className="fw-bold mb-1">{customerName || "—"}</p>
                <p className="text-muted">{customerPhone || "—"}</p>
              </div>

              <div className="col-md-6 text-end">
                <table className="table table-borderless text-end mb-0">
                  <tbody>
                    <tr>
                      <td>Sous-total :</td>
                      <td>{subTotal.toFixed(2)} DH</td>
                    </tr>
                    <tr className="text-danger">
                      <td>Remise :</td>
                      <td>-{discount.toFixed(2)} DH</td>
                    </tr>
                    <tr className="border-top fw-bold fs-5">
                      <td>Total TTC :</td>
                      <td>{total.toFixed(2)} DH</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-dashed my-4" />

          {/* Notes + Actions */}
          <div className="px-4 pb-4">
            <div className="form-group">
              <label className="form-label">Notes / Conditions du devis</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Validité du devis : 30 jours | Conditions de paiement : 50% à la commande, solde à la livraison..."
                value={devisNote}
                onChange={(e) => setDevisNote(e.target.value)}
              />
            </div>

            <div className="d-flex justify-content-end gap-3 mt-4">
              {createdDevisId && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                >
                  Nouveau Devis
                </button>
              )}
              <button
                className={`btn px-4 ${Object.keys(priceAlerts).length > 0 ? "btn-warning" : "btn-primary"}`}
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
                  "Créer Devis"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevisCreate;
