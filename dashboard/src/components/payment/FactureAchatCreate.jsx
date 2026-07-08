import React, { useState, useEffect, useRef } from "react";
import { FiInfo, FiXCircle, FiPackage } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useDatePicker from "@/hooks/useDatePicker";
import topTost from "@/utils/topTost";
import { useSelector } from "react-redux";
import axios from "axios";
import { config_url } from "@/utils/config";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { FaCalendarAlt, FaBuilding, FaPhone, FaEnvelope } from "react-icons/fa";
import { BsPlusCircle } from "react-icons/bs";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const initialItems = [
  {
    id: 1,
    product: "",
    qty: 1,
    price_unit: 1,
    total: 1,
    productId: null,
  },
];

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

// TVA options (Moroccan standard rates)
const tvaOptions = [
  { value: 0, label: "0% (Exonéré)" },
  { value: 7, label: "7% (Taux réduit)" },
  { value: 10, label: "10% (Taux intermédiaire)" },
  { value: 14, label: "14% (Taux normal)" },
  { value: 20, label: "20% (Taux standard)" },
];

const FactureAchatCreate = () => {
  const currentDateWithTime = new Date();
  const { startDate, setStartDate, renderFooter } =
    useDatePicker(currentDateWithTime);

  const [items, setItems] = useState(initialItems);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("brouillon");
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [paymentType, setPaymentType] = useState("espece");
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [dueDate, setDueDate] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState({});

  // TVA state
  const [tvaRate, setTvaRate] = useState(20);
  const [includeTvaInPrice, setIncludeTvaInPrice] = useState(true);
  const [ice, setIce] = useState("");
  const [ste, setSte] = useState("");

  const selectRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!startDate) {
      setStartDate(new Date());
    }
  }, []);

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true);
      try {
        const response = await axios.get(`${config_url}/api/fornisseurs`);
        const supplierOptions = (response.data?.fornisseurs || []).map(
          (supplier) => {
            return {
              value: supplier.id,
              label: `${supplier.reference ? `(${supplier.reference}) ` : ""}${supplier.nom_complete}`,
              searchText: [
                supplier.nom_complete?.toLowerCase() || "",
                supplier.telephone?.toLowerCase() || "",
                supplier.reference?.toLowerCase() || "",
              ].join(" "),
              ...supplier,
            };
          },
        );
        setSuppliers(supplierOptions);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        topTost("Erreur lors du chargement des fournisseurs", "error");
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
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
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.surface}, Prix Achat: ${produit.prix_achat || produit.prix_vente} DH)`,
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

  // Function to check if price is within allowed range
  const checkPriceRange = (produitData, price) => {
    if (!produitData) return { isValid: true, message: "" };

    const prixAchatMin = parseFloat(produitData.prix_achat_min);
    const prixAchatMax = parseFloat(produitData.prix_achat_max);

    if (prixAchatMin && prixAchatMax) {
      if (price < prixAchatMin) {
        return {
          isValid: false,
          message: `⚠️ Prix (${price} DH) inférieur au prix minimum (${prixAchatMin} DH)`,
        };
      }
      if (price > prixAchatMax) {
        return {
          isValid: false,
          message: `⚠️ Prix (${price} DH) supérieur au prix maximum (${prixAchatMax} DH)`,
        };
      }
    } else if (prixAchatMin && price < prixAchatMin) {
      return {
        isValid: false,
        message: `⚠️ Prix (${price} DH) inférieur au prix minimum (${prixAchatMin} DH)`,
      };
    } else if (prixAchatMax && price > prixAchatMax) {
      return {
        isValid: false,
        message: `⚠️ Prix (${price} DH) supérieur au prix maximum (${prixAchatMax} DH)`,
      };
    }

    return { isValid: true, message: "" };
  };

  const loadProduits = async (inputValue) => {
    if (!inputValue) {
      return products;
    }

    const filtered = products.filter((option) => {
      const searchTerm = inputValue.toLowerCase();
      const produit = option.data;
      return (
        produit.reference?.toLowerCase().includes(searchTerm) ||
        produit.designation?.toLowerCase().includes(searchTerm)
      );
    });

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
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.surface}, Prix Achat: ${produit.prix_achat || produit.prix_vente} DH)`,
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
      id: Date.now(),
      product: "",
      qty: 1,
      price_unit: 1,
      total: 1,
      productId: null,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
      const newAlerts = { ...priceAlerts };
      delete newAlerts[id];
      setPriceAlerts(newAlerts);
    }
  };

  // Handle product selection
  const handleProduitSelect = (selectedOption, itemId) => {
    if (!selectedOption) {
      const updatedItems = items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            product: "",
            productId: null,
            price_unit: 1,
          };
          updatedItem.total = updatedItem.qty * updatedItem.price_unit;
          return updatedItem;
        }
        return item;
      });

      setItems(updatedItems);
      setPriceAlerts((prev) => {
        const newAlerts = { ...prev };
        delete newAlerts[itemId];
        return newAlerts;
      });
      return;
    }

    const produitData = selectedOption.data;
    const price = produitData.prix_achat || produitData.prix_vente || 0;

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
        updatedItem.total = updatedItem.qty * updatedItem.price_unit;
        return updatedItem;
      }
      return item;
    });

    setItems(updatedItems);
  };

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

        if (field === "product") {
          updatedItem.productId = null;
        }

        if (["qty", "price_unit"].includes(field)) {
          updatedItem.total = updatedItem.qty * updatedItem.price_unit;
        }

        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handlePriceUnitChange = (id, value) => {
    const price = parseFloat(value) || 0;

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
        updatedItem.total = updatedItem.qty * updatedItem.price_unit;
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplierId) => {
    setSelectedSupplierId(supplierId);

    const selectedSupplier = suppliers.find((s) => s.value == supplierId);
    if (selectedSupplier) {
      setSupplierName(selectedSupplier.nom_complete);
      setSupplierPhone(selectedSupplier.telephone || "");
    }
  };

  // Calculate totals
  const subTotal = items.reduce((accumulator, currentValue) => {
    return accumulator + (currentValue.total || 0);
  }, 0);

  const calculateDiscount = () => {
    if (discountType === "percentage") {
      return (subTotal * discountAmount) / 100;
    } else {
      return discountAmount;
    }
  };

  const discount = calculateDiscount();

  const totalAfterDiscountHT = subTotal - discount;
  const tvaAmount = (totalAfterDiscountHT * tvaRate) / 100;
  const totalTTC = includeTvaInPrice
    ? totalAfterDiscountHT + tvaAmount
    : totalAfterDiscountHT;
  const totalHT = totalAfterDiscountHT;

  const total = totalTTC;

  useEffect(() => {
    const remaining = total;
    setRemainingAmount(remaining > 0 ? remaining : 0);
  }, [total]);

  const handleDiscountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setDiscountAmount(value);
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
    setDiscountAmount(0);
  };

  const getMaxDiscount = () => {
    if (discountType === "percentage") {
      return 100;
    } else {
      return subTotal;
    }
  };

  const resetForm = () => {
    setItems(initialItems);
    setSupplierName("");
    setSupplierPhone("");
    setInvoiceNote("");
    setInvoiceStatus("brouillon");
    setRemainingAmount(0);
    setDiscountAmount(0);
    setDiscountType("fixed");
    setPaymentType("espece");
    setCreatedInvoiceId(null);
    setSelectedSupplierId("");
    setTvaRate(20);
    setIncludeTvaInPrice(true);
    setStartDate(new Date());
    setDueDate(null);
    setPriceAlerts({});
    setIce("");
    setSte("");
  };

  const validateForm = () => {
    if (!supplierName.trim()) {
      topTost("Le nom du fournisseur est requis", "error");
      return false;
    }

    for (const item of items) {
      if (!item.productId && !item.product.trim()) {
        topTost("Veuillez sélectionner un produit pour chaque ligne", "error");
        return false;
      }

      if (item.qty <= 0 || item.price_unit <= 0) {
        topTost("La quantité et le prix doivent être supérieurs à 0", "error");
        return false;
      }
    }

    if (discount > subTotal) {
      topTost("La remise ne peut pas dépasser le sous-total", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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
      const calculatedTvaAmount = tvaAmount;
      const calculatedTotalHT = totalAfterDiscountHT;
      const calculatedTotalTTC = totalTTC;

      const invoiceData = {
        fornisseurId: selectedSupplierId || null,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        issueDate: startDate
          ? startDate.toISOString()
          : new Date().toISOString(),
        dueDate: dueDate ? dueDate.toISOString() : null,
        notes: invoiceNote,
        status: invoiceStatus,
        discountType: discountType,
        discountValue: parseFloat(discountAmount),
        paymentType: paymentType,
        tvaRate: parseFloat(tvaRate),
        tvaAmount: parseFloat(calculatedTvaAmount),
        includeTvaInPrice: includeTvaInPrice,
        items: items.map((item) => ({
          productId: item.productId || null,
          quantity: parseFloat(item.qty),
          unitPrice: parseFloat(item.price_unit),
          totalPrice: parseFloat(item.total),
          articleName: item.product,
          priceAlert: priceAlerts[item.id] || null,
        })),
        subTotal: parseFloat(calculatedSubTotal),
        totalHT: parseFloat(calculatedTotalHT),
        totalTTC: parseFloat(calculatedTotalTTC),
        discountAmount: parseFloat(calculatedDiscount),
        remainingAmount: parseFloat(calculatedTotalTTC),
        ice: ice || "",
        ste: ste || "",
      };

      console.log("📦 Sending Purchase Invoice data to backend:", invoiceData);

      const response = await axios.post(
        `${config_url}/api/factures-achat`,
        invoiceData,
      );

      if (response.data.success) {
        const factureAchat = response.data.factureAchat;

        if (factureAchat && factureAchat.id) {
          setCreatedInvoiceId(factureAchat.id);
        }

        if (hasAlerts) {
          topTost(
            "Facture d'achat créée avec des prix hors fourchette!",
            "warning",
          );
        } else {
          topTost("Facture d'achat créée avec succès!", "success");
        }

        setTimeout(() => {
          MySwal.fire({
            title: hasAlerts ? "Succès avec alertes !" : "Succès !",
            icon: hasAlerts ? "warning" : "success",
            html: `
              <div style="text-align:left;font-size:14px">
                <p><strong>Numéro :</strong> ${factureAchat.num_facture || "N/A"}</p>
                <p><strong>Date :</strong> ${new Date(startDate).toLocaleString("fr-FR")}</p>
                <p><strong>Fournisseur :</strong> ${supplierName}</p>
                <p><strong>Total HT :</strong> ${calculatedTotalHT.toFixed(2)} DH</p>
                <p><strong>TVA (${tvaRate}%) :</strong> ${calculatedTvaAmount.toFixed(2)} DH</p>
                <p><strong>Total TTC :</strong> ${calculatedTotalTTC.toFixed(2)} DH</p>
                <p><strong>Statut :</strong> ${factureAchat.status || "N/A"}</p>
                ${hasAlerts ? '<p class="text-warning mt-2"><strong>⚠️ Attention:</strong> Des prix hors fourchette ont été validés</p>' : ""}
              </div>
            `,
            confirmButtonText: "Voir la facture",
            showCancelButton: true,
            cancelButtonText: "Nouvelle facture",
            backdrop: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate(`/facture-achat/${factureAchat.id}`);
            } else {
              resetForm();
            }
          });
        }, 100);
      }
    } catch (error) {
      console.error("Error creating purchase invoice:", error);

      if (error.response) {
        if (error.response.data.errors) {
          const errorMessages = error.response.data.errors.join(", ");
          topTost(`Erreurs de validation: ${errorMessages}`, "error");
        } else if (error.response.data.message) {
          topTost(error.response.data.message, "error");
        } else {
          topTost("Erreur lors de la création de la facture d'achat", "error");
        }
      } else if (error.request) {
        topTost("Pas de réponse du serveur", "error");
      } else {
        topTost("Erreur lors de la création de la facture d'achat", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

    let priceRangeInfo = "";
    if (produit.prix_achat_min && produit.prix_achat_max) {
      priceRangeInfo = ` | Fourchette achat: ${produit.prix_achat_min} - ${produit.prix_achat_max} DH`;
    } else if (produit.prix_achat_min) {
      priceRangeInfo = ` | Min achat: ${produit.prix_achat_min} DH`;
    } else if (produit.prix_achat_max) {
      priceRangeInfo = ` | Max achat: ${produit.prix_achat_max} DH`;
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
          Stock: {produit.surface} m² | Prix Achat:{" "}
          {produit.prix_achat || produit.prix_vente} DH{priceRangeInfo}
        </div>
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
            <h5>Créer Facture d'Achat</h5>
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

              {/* Supplier Information */}
              <div className="row mt-4">
                <div className="col-md-6">
                  <label className="form-label">
                    <FaBuilding className="me-2" />
                    Fournisseur <span className="text-danger">*</span>
                  </label>
                  <Select
                    options={suppliers}
                    className="react-select"
                    classNamePrefix="react-select"
                    placeholder="Sélectionner un fournisseur"
                    value={suppliers.find(
                      (s) => s.value === selectedSupplierId,
                    )}
                    onChange={(e) => handleSupplierSelect(e.value)}
                    isSearchable
                    required
                    noOptionsMessage={() => "Aucun fournisseur trouvé"}
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
              </div>

              {/* Status, Payment Type, TVA */}
              <div className="row mt-3">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="invoiceStatus" className="form-label">
                      Statut de la Facture:
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
                    <label htmlFor="tvaRate" className="form-label">
                      TVA (%):
                    </label>
                    <select
                      className="form-control"
                      id="tvaRate"
                      value={tvaRate}
                      onChange={(e) => setTvaRate(parseFloat(e.target.value))}
                    >
                      {tvaOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label className="form-label">Prix:</label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="includeTva"
                          id="ttc"
                          checked={includeTvaInPrice}
                          onChange={() => setIncludeTvaInPrice(true)}
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
                          checked={!includeTvaInPrice}
                          onChange={() => setIncludeTvaInPrice(false)}
                        />
                        <label className="form-check-label" htmlFor="ht">
                          HT
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="row mt-3">
                <div className="col-md-4">
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
                <div className="col-md-4">
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
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label">Valeur de la Remise:</label>
                    <div className="p-2 bg-light rounded">
                      <p className="mb-0 fw-bold text-danger">
                        -{discount.toFixed(2)} Dh
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
                  <h6 className="fw-bold">Ajouter des produits :</h6>
                  <span className="fs-12 text-muted">
                    Ajouter des produits à la facture d'achat
                  </span>
                </div>
                <div className="avatar-text avatar-sm">
                  <FiPackage />
                </div>
              </div>
              <div className="table-responsive">
                <table
                  className="table table-bordered overflow-hidden"
                  id="tab_logic"
                >
                  <thead>
                    <tr className="single-item">
                      <th className="text-center wd-100">#</th>
                      <th className="text-center wd-400">Nom d'Article</th>
                      <th className="text-center wd-100">Quantité</th>
                      <th className="text-center wd-100">Prix Unitaire (DH)</th>
                      <th className="text-center wd-150">Total (DH)</th>
                      <th className="text-center wd-100">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const selectedProduct = products.find(
                        (p) => p.value === item.productId,
                      );
                      const hasPriceAlert = priceAlerts[item.id];

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
                              placeholder="Quantité"
                              className="form-control qty"
                              style={{ minWidth: "80px", width: "100px" }}
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
                              name="price_unit"
                              placeholder="Prix Unitaire"
                              className={`form-control price ${hasPriceAlert ? "border-warning" : ""}`}
                              style={{ minWidth: "100px", width: "120px" }}
                              step="0.01"
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
                              value={
                                typeof item.total === "number"
                                  ? item.total.toFixed(2)
                                  : parseFloat(item.total || 0).toFixed(2)
                              }
                            />
                            <small className="text-muted d-block">
                              {item.qty} × {item.price_unit}
                            </small>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() => {
                                const newItem = {
                                  id: Date.now(),
                                  product: item.product,
                                  productId: item.productId,
                                  qty: 1,
                                  price_unit: item.price_unit || 1,
                                  total: parseFloat(item.price_unit) || 1,
                                };
                                const currentIndex = items.findIndex(
                                  (i) => i.id === item.id,
                                );
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
                  Ajouter Nouveau Produit
                  <BsPlusCircle size={15} />
                </button>
              </div>
            </div>

            {/* Summary Section */}
            <div className="px-4 py-3 bg-light mt-4">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">Fournisseur:</label>
                    <p className="fw-bold">{supplierName || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone:</label>
                    <p className="fw-bold">{supplierPhone || "Non spécifié"}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Statut:</label>
                    <p className="fw-bold">
                      {statusOptions.find((opt) => opt.value === invoiceStatus)
                        ?.label || "Brouillon"}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <div className="row justify-content-end">
                    <div className="col-auto">
                      <p className="mb-1">Sous-total:</p>
                      <p className="mb-1 text-danger">Remise:</p>
                      <p className="mb-1">Total HT:</p>
                      <p className="mb-1">TVA ({tvaRate}%):</p>
                      <p className="mb-1 fw-bold">Total TTC:</p>
                    </div>
                    <div className="col-auto text-end">
                      <p className="mb-1">{subTotal.toFixed(2)} Dh</p>
                      <p className="mb-1 text-danger">
                        -{discount.toFixed(2)} Dh
                      </p>
                      <p className="mb-1">{totalHT.toFixed(2)} Dh</p>
                      <p className="mb-1">{tvaAmount.toFixed(2)} Dh</p>
                      <p className="mb-1 fw-bold">{totalTTC.toFixed(2)} Dh</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dashed" />
            <div className="px-4 pb-4">
              <div className="form-group">
                <label htmlFor="InvoiceNote" className="form-label">
                  Description / Notes:
                </label>
                <textarea
                  rows={4}
                  className="form-control"
                  id="InvoiceNote"
                  placeholder="Notes concernant cette facture d'achat..."
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                />
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="ice">
                      ICE
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="ice"
                      placeholder="ICE..."
                      value={ice}
                      onChange={(e) => setIce(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="ste">
                      STE
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="ste"
                      placeholder="Ste..."
                      value={ste}
                      onChange={(e) => setSte(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                {createdInvoiceId && (
                  <button className="btn btn-secondary" onClick={resetForm}>
                    Nouvelle Facture
                  </button>
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
                    "Créer Facture d'Achat"
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

export default FactureAchatCreate;
