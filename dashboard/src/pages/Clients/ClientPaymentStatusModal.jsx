import React, { useState, useEffect } from "react";
import axios from "axios";
import { config_url } from "@/utils/config";
import { useNavigate } from "react-router-dom";
import topTost from "@/utils/topTost";

// Icons
import {
  FiCheckCircle,
  FiClock,
  FiPercent,
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiCalendar,
  FiCreditCard,
  FiAlertCircle,
  FiEye,
  FiPrinter,
} from "react-icons/fi";

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Non Payé" },
  { value: "payée", label: "Payé" },
  { value: "partiellement_payée", label: "Partiellement Payé" },
  { value: "annulée", label: "Annulé" },
];

function ClientPaymentStatusModal({ clientId, clientName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  // Fetch payment status
  useEffect(() => {
    if (clientId) {
      fetchPaymentStatus();
    }
  }, [clientId]);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${config_url}/api/clients/${clientId}/payment-status?includeDetails=true&includeAll=true`,
        { withCredentials: true },
      );

      setPaymentData(response.data);
    } catch (err) {
      console.error("Error fetching payment status:", err);
      setError(
        err.response?.data?.message || "Erreur lors du chargement du statut",
      );
      topTost("Erreur lors du chargement du statut de paiement", "error");
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0,00 MAD";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      envoyé: "bg-primary text-white",
      payée: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulée: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Non Payé",
      payée: "Payé",
      partiellement_payée: "Partiellement Payé",
      annulée: "Annulé",
    };
    return texts[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "payée":
      case "payée":
        return <FiCheckCircle className="me-1" />;
      case "partiellement_payée":
        return <FiPercent className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      default:
        return <FiAlertCircle className="me-1" />;
    }
  };

  // Get document icon
  const getDocumentIcon = (type) => {
    switch (type) {
      case "bon-livraison":
        return <FiTruck className="me-2" />;
      case "facture":
        return <FiFileText className="me-2" />;
      default:
        return <FiFileText className="me-2" />;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchPaymentStatus();
  };

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const blOnly = bonLivraisonsOnly;
    const totalAmount = blOnly.reduce((sum, doc) => sum + (parseFloat(doc.montantTTC) || 0), 0);
    const totalPaid = blOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalPaid) || 0), 0);
    const totalRemaining = blOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalRemaining) || 0), 0);

    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>État de Paiement - ${clientName}</title>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 10mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0;
      padding: 10mm;
    }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h2 { margin: 0; font-size: 18px; }
    .client-info { margin-bottom: 20px; }
    .client-info strong { font-size: 14px; }
    .summary-cards { display: flex; gap: 15px; margin-bottom: 20px; }
    .summary-card {
      flex: 1;
      border: 1px solid #ddd;
      padding: 10px;
      text-align: center;
    }
    .summary-card h4 { margin: 0 0 5px 0; font-size: 10px; color: #666; }
    .summary-card .amount { font-size: 14px; font-weight: bold; }
    .summary-card.total { background: #f5f5f5; }
    .summary-card.paid { background: #e8f5e9; }
    .summary-card.remaining { background: #ffebee; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
    th { background: #f2f2f2; font-size: 10px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-success { color: #28a745; }
    .text-danger { color: #dc3545; }
    .badge { padding: 2px 6px; border-radius: 3px; font-size: 9px; }
    .badge-danger { background: #dc3545; color: white; }
    .badge-success { background: #28a745; color: white; }
    .badge-warning { background: #ffc107; color: #000; }
    .badge-primary { background: #007bff; color: white; }
    .badge-dark { background: #343a40; color: white; }
    .footer { margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 9px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h2>État de Paiement - Client</h2>
    <p>STE. RACHIGLASS S.A.R.L. A.U</p>
  </div>

  <div class="client-info">
    <strong>Client:</strong> ${clientName}<br/>
    <strong>Date:</strong> ${new Date().toLocaleDateString("fr-FR")}
  </div>

  <div class="summary-cards">
    <div class="summary-card total">
      <h4>MONTANT TOTAL BL</h4>
      <div class="amount">${formatCurrency(totalAmount)}</div>
    </div>
    <div class="summary-card paid">
      <h4>DÉJÀ PAYÉ</h4>
      <div class="amount text-success">${formatCurrency(totalPaid)}</div>
    </div>
    <div class="summary-card remaining">
      <h4>RESTE À PAYER</h4>
      <div class="amount text-danger">${formatCurrency(totalRemaining)}</div>
    </div>
  </div>

  <h3>Bon Livraisons</h3>
  <table>
    <thead>
      <tr>
        <th>Numéro</th>
        <th>Date</th>
        <th>Statut</th>
        <th class="text-right">Montant TTC</th>
        <th class="text-right">Déjà Payé</th>
        <th class="text-right">Reste à Payer</th>
      </tr>
    </thead>
    <tbody>
      ${blOnly.map(doc => `
        <tr>
          <td>
            ${doc.numero}
            ${doc.is_facture === false ? '<br><small style="color:#666;">Non facturé</small>' : ''}
          </td>
          <td>${formatDate(doc.date)}</td>
          <td><span class="badge ${getStatusColor(doc.paymentStatus)}">${getStatusText(doc.paymentStatus)}</span></td>
          <td class="text-right">${formatCurrency(doc.montantTTC)}</td>
          <td class="text-right text-success">${formatCurrency(doc.totalPaid)}</td>
          <td class="text-right text-danger">${formatCurrency(doc.totalRemaining)}</td>
        </tr>
      `).join("")}
      <tr style="background:#f2f2f2;font-weight:bold;">
        <td colspan="3" class="text-right">TOTAUX:</td>
        <td class="text-right">${formatCurrency(totalAmount)}</td>
        <td class="text-right text-success">${formatCurrency(totalPaid)}</td>
        <td class="text-right text-danger">${formatCurrency(totalRemaining)}</td>
      </tr>
    </tbody>
  </table>

  ${paymentData?.advancements?.length > 0 ? `
  <h3 style="margin-top:20px;">Historique des Avancements</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Montant</th>
        <th>Mode de Paiement</th>
        <th>Référence</th>
      </tr>
    </thead>
    <tbody>
      ${paymentData.advancements.map(adv => `
        <tr>
          <td>${formatDate(adv.paymentDate)}</td>
          <td class="text-success">${formatCurrency(adv.amount)}</td>
          <td>${adv.paymentMethod === 'espece' ? 'Espèce' : adv.paymentMethod === 'cheque' ? 'Chèque' : adv.paymentMethod === 'virement' ? 'Virement' : adv.paymentMethod === 'carte' ? 'Carte' : adv.paymentMethod || '-'}</td>
          <td>${adv.reference || '-'}</td>
        </tr>
      `).join("")}
      <tr style="background:#f2f2f2;font-weight:bold;">
        <td colspan="2" class="text-right">TOTAL AVANCEMENTS:</td>
        <td colspan="2" class="text-right text-success">${formatCurrency(paymentData.advancements.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0))}</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <p>Généré le ${new Date().toLocaleString("fr-FR")}</p>
    <p>STE. RACHIGLASS S.A.R.L. A.U - VENTE TOUS TYPE DE VERRE</p>
  </div>

  <script>
    window.onload = function() { window.print(); setTimeout(() => window.close(), 100); };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Filter to show only Bon Livraisons
  const bonLivraisonsOnly = paymentData?.documents?.filter(
    (doc) => doc.type === "bon-livraison"
  ) || [];

  // Handle view document
  const handleViewDocument = (doc) => {
    if (doc.type === "bon-livraison") {
      navigate(`/bon-livraisons/${doc.documentId}`);
    } else if (doc.type === "facture") {
      navigate(`/factures/${doc.documentId}`);
    }
  };

  if (loading) {
    return (
      <div
        className="modal fade show d-block" onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header position-relative">
              <h5 className="modal-title">Statut de Paiement</h5>
              <button
                type="button"
                className="btn-close position-absolute" style={{ top: "15px", right: "15px" }}
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-3">Chargement du statut de paiement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="modal fade show d-block" onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header position-relative">
              <h5 className="modal-title">Statut de Paiement</h5>
              <button
                type="button"
                className="btn-close position-absolute" style={{ top: "15px", right: "15px" }}
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body text-center py-5">
              <FiAlertCircle size={48} className="text-danger mb-3" />
              <h5>Erreur</h5>
              <p className="text-muted">{error}</p>
              <button className="btn btn-primary mt-3" onClick={handleRefresh}>
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal fade show d-block" onClick={onClose}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-light position-relative">
            <div>
              <h5 className="modal-title mb-1">État de Paiement - Client (Tous les Statuts)</h5>
              <p className="text-muted mb-0 small">
                {clientName} | Dernière mise à jour:{" "}
                {paymentData?.timestamp
                  ? formatDate(paymentData.timestamp)
                  : "-"}
              </p>
            </div>
            <div className="d-flex gap-2 pe-5">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
                title="Imprimer"
              >
                <FiPrinter className="me-1" /> Imprimer
              </button>
              <button
                type="button"
                className="btn-close position-absolute" style={{ top: "15px", right: "15px" }}
                onClick={onClose}
              ></button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body">
            {paymentData && (
              <>
{/* Statistics Cards - Bon Livraisons Only */}
                <div className="row mb-4">
                  <div className="col-md-4 mb-3">
                    <div className="card border-primary">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Montant Total BL</h6>
                            <h3 className="mb-0">
                              {formatCurrency(
                                bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.montantTTC) || 0), 0)
                              )}
                            </h3>
                          </div>
                          <div className="bg-primary bg-opacity-10 p-3 rounded">
                            <FiDollarSign size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <div className="card border-success">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Déjà Payé BL</h6>
                            <h3 className="mb-0">
                              {formatCurrency(
                                bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalPaid) || 0), 0)
                              )}
                            </h3>
                          </div>
                          <div className="bg-success bg-opacity-10 p-3 rounded">
                            <FiCheckCircle size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <div className="card border-danger">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted mb-1">Reste à Payer BL</h6>
                            <h3 className="mb-0">
                              {formatCurrency(
                                bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalRemaining) || 0), 0)
                              )}
                            </h3>
                          </div>
                          <div className="bg-danger bg-opacity-10 p-3 rounded">
                            <FiCreditCard size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Table */}
                <div className="row">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="card-title mb-0">
                          <FiFileText className="me-2" />
                          Bon Livraisons en Attente de Paiement (
                          {bonLivraisonsOnly.length})
                        </h6>
                      </div>
                      <div className="card-body">
                        {bonLivraisonsOnly.length === 0 ? (
                          <div className="text-center py-4">
                            <FiCheckCircle
                              size={48}
                              className="text-success mb-3"
                            />
                            <h5>Aucun document en attente</h5>
                            <p className="text-muted">
                              Tous les documents sont payés
                            </p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead>
                                <tr>
                                  <th>Numéro</th>
                                  <th>Date</th>
                                  <th>Statut</th>
                                  <th>Montant TTC</th>
                                  <th>Déjà Payé</th>
                                  <th>Reste à Payer</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bonLivraisonsOnly.map((doc, index) => (
                                  <tr key={index}>
                                    <td>
                                      <strong>{doc.numero}</strong>
                                      {doc.is_facture === false && (
                                        <div className="small text-muted">
                                          Non facturé
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span className="d-flex align-items-center">
                                        <FiCalendar className="me-1 text-muted" />
                                        {formatDate(doc.date)}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`badge ${getStatusColor(doc.paymentStatus)}`}
                                      >
                                        {getStatusIcon(doc.paymentStatus)}
                                        {getStatusText(doc.paymentStatus)}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{formatCurrency(doc.montantTTC)}</strong>
                                    </td>
                                    <td>
                                      <span className="text-success">
                                        {formatCurrency(doc.totalPaid)}
                                      </span>
                                      {doc.montantTTC > 0 && (
                                        <div className="small text-muted">
                                          {Math.round(
                                            (doc.totalPaid / doc.montantTTC) *
                                              100,
                                          )}
                                          %
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span className="text-danger fw-bold">
                                        {formatCurrency(doc.totalRemaining)}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="d-flex gap-2">
                                        <button
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() =>
                                            handleViewDocument(doc)
                                          }
                                          title="Voir le document"
                                        >
                                          <FiEye size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
</tbody>
                              <tfoot>
                                <tr className="table-active">
                                  <td colSpan="3" className="text-end">
                                    <strong>Totaux:</strong>
                                  </td>
                                  <td>
                                    <strong>
                                      {formatCurrency(
                                        bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.montantTTC) || 0), 0)
                                      )}
                                    </strong>
                                  </td>
                                  <td>
                                    <strong className="text-success">
                                      {formatCurrency(
                                        bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalPaid) || 0), 0)
                                      )}
                                    </strong>
                                  </td>
                                  <td>
                                    <strong className="text-danger">
                                      {formatCurrency(
                                        bonLivraisonsOnly.reduce((sum, doc) => sum + (parseFloat(doc.totalRemaining) || 0), 0)
                                      )}
                                    </strong>
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Advancements Table */}
            {paymentData?.advancements && paymentData.advancements.length > 0 && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h6 className="card-title mb-0">
                        <FiDollarSign className="me-2" />
                        Historique des Avancements ({paymentData.advancements.length})
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Montant</th>
                              <th>Mode de Paiement</th>
                              <th>Référence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentData.advancements.map((adv, index) => (
                              <tr key={index}>
                                <td>
                                  <span className="d-flex align-items-center">
                                    <FiCalendar className="me-1 text-muted" />
                                    {formatDate(adv.paymentDate)}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-success fw-bold">
                                    {formatCurrency(adv.amount)}
                                  </span>
                                </td>
                                <td>
                                  {adv.paymentMethod === 'espece' ? 'Espèce' :
                                   adv.paymentMethod === 'cheque' ? 'Chèque' :
                                   adv.paymentMethod === 'virement' ? 'Virement' :
                                   adv.paymentMethod === 'carte' ? 'Carte' :
                                   adv.paymentMethod || '-'}
                                </td>
                                <td>{adv.reference || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-active">
                              <td colSpan="2" className="text-end">
                                <strong>Total Avancements:</strong>
                              </td>
                              <td colspan="2">
                                <strong className="text-success">
                                  {formatCurrency(
                                    paymentData.advancements.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)
                                  )}
                                </strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientPaymentStatusModal;
