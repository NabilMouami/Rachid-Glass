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
} from "react-icons/fi";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const FactureAchatsDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [facture, setFacture] = useState(null);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
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
    ice: "",
    ste: "",
  });

  // Fetch suppliers/clients
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const response = await axios.get(`${config_url}/api/clients`);
        const supplierOptions = (response.data?.clients || []).map((client) => {
          const refPart = client.reference ? `(${client.reference}) ` : "";
          return {
            value: client.id,
            label: `${refPart}${client.nom_complete}${client.telephone ? ` - ${client.telephone}` : ""}`,
            searchText: [
              client.nom_complete?.toLowerCase() || "",
              client.telephone?.toLowerCase() || "",
              client.reference?.toLowerCase() || "",
              client.email?.toLowerCase() || "",
            ].join(" "),
            ...client,
          };
        });
        setSuppliers(supplierOptions);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Handle supplier selection
  const handleSupplierSelect = (supplierId) => {
    setSelectedSupplierId(supplierId);
    const selectedSupplier = suppliers.find((s) => s.value == supplierId);
    if (selectedSupplier) {
      setFormData((prev) => ({
        ...prev,
        supplierName: selectedSupplier.nom_complete || "",
        supplierPhone: selectedSupplier.telephone || "",
        supplierEmail: selectedSupplier.email || "",
        ice: selectedSupplier.ice || "",
      }));
    }
  };

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
      const unitPrice = parseFloat(produit.prix_achat) || 0;
      const item = updatedItems[index];
      const quantity = item?.quantity || 1;
      updatedItems[index] = {
        ...item,
        code: produit.reference,
        designation: produit.designation,
        produit_id: selectedOption.value,
        produit: produit,
        unitPrice: unitPrice,
        totalPrice: quantity * unitPrice,
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
      const res = await axios.get(`${config_url}/api/factures-achat/${id}`);
      const data = res.data.factureAchat; // Fixed: Changed from 'facture' to 'factureAchat'

      setFacture(data);

      const mappedItems = data.lignes
        ? data.lignes.map((ligne) => ({
            id: ligne.id,
            code: ligne.produit?.reference || "",
            designation: ligne.produit?.designation || "",
            quantity: parseFloat(ligne.quantite) || 0,
            unitPrice: parseFloat(ligne.prix_unitaire) || 0,
            totalPrice: parseFloat(ligne.total_ligne) || 0,
            produit_id: ligne.produit_id,
            produit: ligne.produit,
          }))
        : [];

      setFormData({
        supplierName: data.supplierName || "",
        supplierPhone: data.supplierPhone || "",
        supplierEmail: data.supplierEmail || "",
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || "",
        status: data.status || "brouillon",
        discountType: data.discountType || "fixed",
        discountValue: parseFloat(data.discountValue) || 0,
        paymentType: data.paymentType || "non_paye",
        tvaRate: parseFloat(data.tvaRate) || 20,
        includeTvaInPrice: data.includeTvaInPrice !== false,
        items: mappedItems,
        ice: data.ice || "",
        ste: data.ste || "",
      });
    } catch (err) {
      console.error(err);
      topTost("Erreur chargement facture achat", "error");
      navigate("/facture-achat/list");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner color="primary" />
        <div className="mt-3">Chargement de la facture achat...</div>
      </Container>
    );
  }

  if (!facture) {
    return (
      <Container className="py-5">
        <Alert color="danger">Facture achat introuvable</Alert>
      </Container>
    );
  }

  // Update the calculation functions
  // Update the calculation functions
  const subTotal = formData.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const discount = calculateDiscount();

  // Calculate totals
  // Total HT = Subtotal - Discount (this is the base amount before TVA)
  const totalHT = Math.max(0, subTotal - discount);

  // TVA Amount = Total HT × TVA Rate
  const tvaAmount = totalHT * (formData.tvaRate / 100);

  // NET TTC À PAYER = Total HT + TVA Amount
  const totalTTC = totalHT + tvaAmount;

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

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    const numValue = parseFloat(value) || 0;

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: numValue,
    };

    const item = updatedItems[index];
    updatedItems[index].totalPrice = item.quantity * item.unitPrice;

    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      code: "",
      designation: "",
      quantity: 1,
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

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updatedItems }));
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

    try {
      // Recalculate totals to ensure consistency
      const currentSubTotal = formData.items.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
        0,
      );

      const currentDiscount =
        formData.discountType === "percentage"
          ? (currentSubTotal * formData.discountValue) / 100
          : formData.discountValue;

      // Total HT = Subtotal - Discount
      const currentTotalHT = Math.max(0, currentSubTotal - currentDiscount);

      // TVA Amount = Total HT × TVA Rate
      const currentTvaAmount = currentTotalHT * (formData.tvaRate / 100);

      // NET TTC À PAYER = Total HT + TVA Amount
      const currentTotalTTC = currentTotalHT + currentTvaAmount;

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
        subTotal: currentSubTotal,
        discountAmount: currentDiscount,
        totalHT: currentTotalHT,
        totalTTC: currentTotalTTC,
        tvaAmount: currentTvaAmount,
        items: formData.items.map((item) => ({
          id: item.id?.toString().startsWith("temp-") ? undefined : item.id,
          produit_id: item.produit_id,
          quantite: item.quantity,
          prix_unitaire: item.unitPrice,
          remise_ligne: 0,
          total_ligne: item.totalPrice,
        })),
        ice: formData.ice || "",
        ste: formData.ste || "",
      };

      await axios.put(
        `${config_url}/api/factures-achat/${facture.id}`,
        payload,
      );

      topTost("Facture achat mise à jour avec succès!", "success");
      navigate("/facture-achat/list");
    } catch (error) {
      console.error("Error updating invoice:", error);
      topTost(
        error.response?.data?.message || "Erreur lors de la mise à jour",
        "error",
      );
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const creationDateFormatted = formatDateWithTime(formData.issueDate);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Facture Achat ${facture.invoiceNumber}</title>
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
      <h2>FACTURE D'ACHAT</h2>
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
      <strong>Fournisseur :</strong><br/>
      ${formData.supplierName}<br/>
      ${formData.supplierPhone ? `Tél: ${formData.supplierPhone}` : ""}<br/>
      ${formData.supplierEmail ? `Email: ${formData.supplierEmail}` : ""}<br/>
      ${formData.ice ? `ICE: ${formData.ice}` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th>Quantite</th>
        <th>Prix U</th>
        <th>Montant</th>
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
    <div>Sous-total HT : ${formatAmount(subTotal)} DH</div>
    ${discount > 0 ? `<div>Remise : -${formatAmount(discount)} DH</div>` : ""}
    <div>Total HT : ${formatAmount(totalHT)} DH</div>
    <div>TVA (${formData.tvaRate}%) : ${formatAmount(tvaAmount)} DH</div>
    <div class="net-box">
      <span>Net TTC à payer</span>
      <span>${formatAmount(totalTTC)} DH</span>
    </div>
    <div class="italic">
      ${totalToFrenchText(totalTTC)}
    </div>
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
          <h2 style="margin:0; font-size:1rem; letter-spacing:1px;">FACTURE D'ACHAT</h2>
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
        <strong>Fournisseur :</strong><br/>
        ${formData.supplierName}<br/>
        ${formData.supplierPhone ? `Tél: ${formData.supplierPhone}` : ""}<br/>
        ${formData.supplierEmail ? `Email: ${formData.supplierEmail}` : ""}<br/>
        ${formData.ice ? `ICE: ${formData.ice}` : ""}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.65rem;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Code</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Désignation</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Quantite</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Prix Achat</th>
            <th style="border:1.5px solid #000; padding:6px; text-align:center;">Monatnt</th>
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
        <div>Total HT : ${formatAmount(totalHT)} DH</div>
        <div>TVA (${formData.tvaRate}%) : ${formatAmount(tvaAmount)} DH</div>
        <div style="font-weight:bold; font-size:14px;">
          <span>Total TTC : ${formatAmount(totalTTC)} DH</span>
        </div>
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
      pdf.save(`Facture-Achat-${facture.invoiceNumber}.pdf`);

      topTost("PDF généré et téléchargé !", "success");
    } catch (err) {
      console.error(err);
      topTost("Erreur lors de la création du PDF", "error");
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mt-3 mb-1">
            Facture Achat #{facture.invoiceNumber}
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
          <Button color="primary" onClick={handleSubmit}>
            Enregistrer
          </Button>
        </div>
      </div>

      <Row>
        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiUser className="me-2" /> Fournisseur
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">
                  Sélectionner un Fournisseur
                </label>
                <Select
                  options={suppliers}
                  value={
                    selectedSupplierId
                      ? suppliers.find((s) => s.value == selectedSupplierId)
                      : null
                  }
                  onChange={(option) =>
                    handleSupplierSelect(option?.value || "")
                  }
                  placeholder="Choisissez un fournisseur..."
                  isClearable
                  isSearchable
                  isLoading={loadingSuppliers}
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
                <label className="form-label">Nom Fournisseur *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.supplierPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierPhone: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.supplierEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierEmail: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">ICE</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.ice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ice: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="p-3 mb-4">
            <h5>
              <FiCalendar className="me-2" /> Informations
            </h5>
            <div className="mt-2">
              <div className="form-group mb-3">
                <label className="form-label">Date</label>
                <DatePicker
                  selected={formData.issueDate}
                  onChange={(date) =>
                    setFormData((prev) => ({ ...prev, issueDate: date }))
                  }
                  className="form-control"
                  dateFormat="dd/MM/yyyy HH:mm"
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="Heure"
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Date Échéance</label>
                <DatePicker
                  selected={formData.dueDate}
                  onChange={(date) =>
                    setFormData((prev) => ({ ...prev, dueDate: date }))
                  }
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  isClearable
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
                <label className="form-label">Mode de Paiement</label>
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

      <Card className="p-3 mb-4">
        <h5>
          <FiPercent className="me-2" /> TVA et Remise
        </h5>
        <Row className="mt-3">
          <Col md={4}>
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
          <Col md={4}>
            <div className="form-group mb-3">
              <label className="form-label">Inclure TVA dans le prix</label>
              <select
                className="form-control"
                value={formData.includeTvaInPrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    includeTvaInPrice: e.target.value === "true",
                  }))
                }
              >
                <option value="true">Oui (Prix TTC)</option>
                <option value="false">Non (Prix HT)</option>
              </select>
            </div>
          </Col>
          <Col md={4}>
            <div className="form-group mb-3">
              <label className="form-label">Type de Remise</label>
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
                <option value="fixed">Montant Fixe (Dh)</option>
                <option value="percentage">Pourcentage (%)</option>
              </select>
            </div>
          </Col>
          <Col md={4}>
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
                  setFormData((prev) => ({
                    ...prev,
                    discountValue: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                max={formData.discountType === "percentage" ? 100 : subTotal}
              />
            </div>
          </Col>
        </Row>
      </Card>

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
                <th style={{ width: "30%" }}>Désignation</th>
                <th style={{ width: "10%" }}>Quantite</th>
                <th style={{ width: "15%" }}>Prix Achat</th>
                <th style={{ width: "15%" }}>Montant</th>
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
                    <td className="align-middle">
                      <span className="fw-bold text-primary">
                        {item.produit?.reference || item.code || "—"}
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
                                      prix_achat: item.unitPrice,
                                    },
                                  }
                                : null
                            }
                            onChange={(opt) => handleProductSelect(opt, index)}
                            placeholder="Rechercher produit..."
                            isClearable
                            isLoading={loadingProduits}
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
                              Stock: {item.produit.qty || 0} | Prix Achat:{" "}
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

      <Card className="p-3 mb-4">
        <div className="form-group mb-3">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            rows="2"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Notes ou observations..."
          />
        </div>
      </Card>

      <Card className="p-3">
        <h5>Résumé financier</h5>
        <Row className="mt-3">
          <Col md={6}>
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
              <div className="d-flex justify-content-between mb-2 fw-bold">
                <span>Total HT:</span>
                <strong>{formatAmount(totalHT)} Dh</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>TVA ({formData.tvaRate}%):</span>
                <strong>{formatAmount(tvaAmount)} Dh</strong>
                <span className="text-muted small">
                  ({formatAmount(totalHT)} × {formData.tvaRate}%)
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2 fw-bold border-top pt-2">
                <span>NET TTC À PAYER:</span>
                <span className="text-primary fs-5">
                  {formatAmount(totalTTC)} Dh
                </span>
              </div>
              <div className="mt-3 small fst-italic">
                <strong>{totalToFrenchText(totalTTC)}</strong>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default FactureAchatsDetailsPage;
