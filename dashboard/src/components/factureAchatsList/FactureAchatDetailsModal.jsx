import React, { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
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

const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
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

const FactureAchatDetailsModal = ({ isOpen, toggle, invoice, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    supplierName: "",
    supplierPhone: "",
    supplierEmail: "",
    issueDate: new Date(),
    dueDate: null,
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    paymentType: "non_paye",
    tvaRate: 20,
    includeTvaInPrice: true,
    items: [],
    advancements: [],
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
            displayText: `${produit.reference} - ${produit.designation} (Stock: ${produit.qty}, Prix Achat: ${produit.prix_achat} DH)`,
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
            displayText: `${p.reference} - ${p.designation} (Stock: ${p.qty}, Prix Achat: ${p.prix_achat} DH)`,
          },
        }));
      } catch (err) {
        console.error(err);
        return [];
      }
    }

    return filtered;
  };

  useEffect(() => {
    if (invoice) {
      const mappedItems = invoice.lignes
        ? invoice.lignes.map((ligne, index) => ({
            id: ligne.id || `temp-${index}`,
            code: ligne.produit?.reference || "",
            designation: ligne.produit?.designation || "",
            quantity: parseFloat(ligne.quantite) || 0,
            unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            remise_ligne: parseFloat(ligne.remise_ligne) || 0,
            totalPrice: parseFloat(ligne.total_ligne) || 0,
            produit_id: ligne.produit_id,
            produit: ligne.produit,
          }))
        : [];

      setFormData({
        supplierName: invoice.supplierName || invoice.client || "",
        supplierPhone: invoice.supplierPhone || "",
        supplierEmail: invoice.supplierEmail || "",
        issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        notes: invoice.notes || "",
        status: invoice.status || "brouillon",
        discountType: invoice.discountType || "fixed",
        discountValue: parseFloat(invoice.discountValue) || 0,
        paymentType: invoice.paymentType || "non_paye",
        tvaRate: parseFloat(invoice.tvaRate) || 20,
        includeTvaInPrice: invoice.includeTvaInPrice !== false,
        items: mappedItems,
        advancements: invoice.advancements || [],
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
    } else {
      return formData.discountValue;
    }
  };

  const discount = calculateDiscount();
  const totalAfterDiscountHT = Math.max(0, subTotal - discount);
  const totalTTC = totalAfterDiscountHT;
  const totalHT = totalTTC / 1.2;
  const tvaAmount = totalTTC - totalHT;

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
      updatedItems[index] = {
        ...updatedItems[index],
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: parseFloat(produit.prix_achat) || 0,
        totalPrice: calculateItemTotal({
          ...updatedItems[index],
          unitPrice: parseFloat(produit.prix_achat) || 0,
        }),
      };
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
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
      produit_id: null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleDeleteItem = async (index) => {
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
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: parseFloat(value) || 0,
    };

    if (["quantity", "unitPrice", "remise_ligne"].includes(field)) {
      updatedItems[index].totalPrice = calculateItemTotal(updatedItems[index]);
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.supplierName.trim()) {
      topTost("Le nom du fournisseur est requis", "error");
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      topTost("La facture doit avoir au moins un article", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supplierName: formData.supplierName.trim(),
        supplierPhone: formData.supplierPhone.trim(),
        supplierEmail: formData.supplierEmail.trim(),
        issueDate: formData.issueDate.toISOString(),
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        paymentType: formData.paymentType,
        tvaRate: formData.tvaRate,
        includeTvaInPrice: formData.includeTvaInPrice,
        subTotal: subTotal,
        discountAmount: discount,
        totalHT: totalAfterDiscountHT,
        totalTTC: totalTTC,
        tvaAmount: tvaAmount,
        items: formData.items.map((item) => ({
          id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
          produit_id: item.produit_id,
          quantite: item.quantity,
          prix_unitaire: item.unitPrice,
          remise_ligne: item.remise_ligne || 0,
          total_ligne: item.totalPrice,
        })),
        ice: formData.ice || "",
        ste: formData.ste || "",
      };

      await axios.put(
        `${config_url}/api/facture-achat/${invoice.id}`,
        payload,
      );

      topTost("Facture d'achat mise à jour avec succès!", "success");
      onUpdate();
      toggle();
    } catch (error) {
      console.error("Error updating invoice:", error);
      topTost(error.response?.data?.message || "Erreur lors de la mise à jour", "error");
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

    const printWindow = window.open("", "_blank");
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture Achat ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .info-block {
      flex: 1;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .table th, .table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .table th {
      background-color: #f5f5f5;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .totals p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>FACTURE D'ACHAT</h2>
    <h3>STE. RACHIGLASS S.A.R.L. A.U</h3>
  </div>

  <div class="info-row">
    <div class="info-block">
      <h4>Fournisseur</h4>
      <p><strong>Nom:</strong> ${formData.supplierName}</p>
      <p><strong>Tél:</strong> ${formData.supplierPhone || "-"}</p>
      <p><strong>Email:</strong> ${formData.supplierEmail || "-"}</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>Facture N°:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
      <p><strong>TVA:</strong> ${formData.tvaRate}%</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix Achat</th>
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
    ${discount > 0 ? `<p><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>` : ""}
    <p><strong>Total HT:</strong> ${totalAfterDiscountHT.toFixed(2)} Dh</p>
    <p><strong>TVA (${formData.tvaRate}%):</strong> +${tvaAmount.toFixed(2)} Dh</p>
    <p style="font-weight:bold; font-size:14px;"><strong>Total TTC:</strong> ${totalTTC.toFixed(2)} Dh</p>
  </div>

  ${formData.notes ? `<div style="margin-top:20px;"><strong>Notes:</strong> ${formData.notes}</div>` : ""}
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

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" style={{ maxWidth: "90vw" }}>
      <ModalHeader toggle={toggle}>
        Facture Achat #{invoice.invoiceNumber}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label || formData.status}
        </Badge>
        <Badge color={getTvaBadgeColor(formData.tvaRate)} className="ms-2">
          TVA {formData.tvaRate}%
        </Badge>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Nom Fournisseur *</label>
              <input
                type="text"
                className="form-control"
                value={formData.supplierName}
                onChange={(e) => handleInputChange("supplierName", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Téléphone</label>
              <input
                type="tel"
                className="form-control"
                value={formData.supplierPhone}
                onChange={(e) => handleInputChange("supplierPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.supplierEmail}
                onChange={(e) => handleInputChange("supplierEmail", e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group mb-3">
              <label className="form-label">Date</label>
              <DatePicker
                selected={formData.issueDate}
                onChange={(date) => handleInputChange("issueDate", date)}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group mb-3">
              <label className="form-label">Date Échéance</label>
              <DatePicker
                selected={formData.dueDate}
                onChange={(date) => handleInputChange("dueDate", date)}
                className="form-control"
                dateFormat="dd/MM/yyyy"
                isClearable
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
              <label className="form-label">Mode de Paiement</label>
              <select
                className="form-control"
                value={formData.paymentType}
                onChange={(e) => handleInputChange("paymentType", e.target.value)}
              >
                {paymentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Taux de TVA</label>
              <select
                className="form-control"
                value={formData.tvaRate}
                onChange={(e) => handleInputChange("tvaRate", parseFloat(e.target.value))}
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
              <label className="form-label">Type de Remise</label>
              <select
                className="form-control"
                value={formData.discountType}
                onChange={(e) => handleInputChange("discountType", e.target.value)}
              >
                <option value="fixed">Montant Fixe (Dh)</option>
                <option value="percentage">Pourcentage (%)</option>
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">
                {formData.discountType === "percentage" ? "Remise (%)" : "Remise (Dh)"}
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.discountValue}
                onChange={(e) => handleInputChange("discountValue", parseFloat(e.target.value) || 0)}
                min="0"
                max={formData.discountType === "percentage" ? 100 : subTotal}
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
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">STE</label>
              <input
                type="text"
                className="form-control"
                value={formData.ste}
                onChange={(e) => handleInputChange("ste", e.target.value)}
              />
            </div>
          </div>

          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="2"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Articles</h6>
              <Button color="success" size="sm" onClick={handleAddItem}>
                <FiPlus className="me-1" />
                Ajouter un article
              </Button>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th style={{ width: "80px" }}>Qty</th>
                    <th style={{ width: "120px" }}>Prix Achat</th>
                    <th style={{ width: "120px" }}>Total HT</th>
                    <th style={{ width: "50px" }}></th>
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
                          <div className="text-center py-2 text-muted">Chargement...</div>
                        ) : (
                          <AsyncSelect
                            cacheOptions
                            loadOptions={loadProduits}
                            defaultOptions={products}
                            value={products.find((p) => p.value === item.produit_id) || null}
                            onChange={(opt) => handleProductSelect(opt, index)}
                            placeholder="Rechercher produit..."
                            isClearable
                            menuPortalTarget={document.body}
                            styles={{
                              control: (base) => ({ ...base, minHeight: "38px" }),
                              menu: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ minWidth: "70px" }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          min="1"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ minWidth: "110px" }}
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="align-middle text-end fw-bold">
                        {item.totalPrice.toFixed(2)} Dh
                      </td>
                      <td className="text-center">
                        <Button color="danger" size="sm" onClick={() => handleDeleteItem(index)}>
                          <FiTrash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-12">
            <div className="row mt-3">
              <div className="col-md-6"></div>
              <div className="col-md-6">
                <table className="table table-sm table-borderless text-end">
                  <tbody>
                    <tr>
                      <td>Sous-total HT:</td>
                      <td className="fw-bold">{subTotal.toFixed(2)} Dh</td>
                    </tr>
                    {discount > 0 && (
                      <tr className="text-danger">
                        <td>Remise:</td>
                        <td>- {discount.toFixed(2)} Dh</td>
                      </tr>
                    )}
                    <tr>
                      <td>Total HT:</td>
                      <td className="fw-bold">{totalAfterDiscountHT.toFixed(2)} Dh</td>
                    </tr>
                    <tr>
                      <td>TVA ({formData.tvaRate}%):</td>
                      <td>+ {tvaAmount.toFixed(2)} Dh</td>
                    </tr>
                    <tr className="border-top fw-bold fs-5">
                      <td>Total TTC:</td>
                      <td className="text-primary">{totalTTC.toFixed(2)} Dh</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Fermer
        </Button>
        <Button color="info" onClick={handlePrint}>
          <FiPrinter className="me-1" />
          Imprimer
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={isSubmitting}>
          <FiSave className="me-1" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default FactureAchatDetailsModal;
