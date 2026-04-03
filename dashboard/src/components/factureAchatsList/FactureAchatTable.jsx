import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import FactureAchatDetailsModal from "./FactureAchatDetailsModal";
import Table from "@/components/shared/table/Table";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays } from "date-fns";
import {
  FiEye,
  FiPlusCircle,
  FiTrash,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiPercent,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import {
  Card,
  CardBody,
  Badge,
} from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link, useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
];

const tvaRateOptions = [
  { value: "all", label: "Tous les taux" },
  { value: 0, label: "0% (Exonéré)" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 14, label: "14%" },
  { value: 20, label: "20%" },
];

const safeToFixed = (value, decimals = 2) => {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return "0." + "0".repeat(decimals);
  }
  return value.toFixed(decimals);
};

const formatDateForInput = (date) => {
  if (!date) return "";
  try {
    return format(new Date(date), "yyyy-MM-dd");
  } catch (error) {
    return "";
  }
};

const formatToFrenchDate = (date) => {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch (error) {
    return "";
  }
};

const formatDateTime = (date) => {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  } catch (error) {
    return "";
  }
};

const FactureAchatTable = () => {
  const navigate = useNavigate();
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTvaRate, setSelectedTvaRate] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [displayStartDate, setDisplayStartDate] = useState(
    formatToFrenchDate(subDays(new Date(), 30)),
  );
  const [displayEndDate, setDisplayEndDate] = useState(
    formatToFrenchDate(new Date()),
  );

  const [statistics, setStatistics] = useState({
    totalFactures: 0,
    totalHT: 0,
    totalTVA: 0,
    totalTTC: 0,
    totalAdvancements: 0,
    totalRemaining: 0,
    paidFactures: 0,
    draftFactures: 0,
    partiallyPaidFactures: 0,
    cancelledFactures: 0,
    averageHT: 0,
    averageTTC: 0,
    completionRate: 0,
    tvaByRate: {
      0: 0,
      7: 0,
      10: 0,
      14: 0,
      20: 0,
    },
  });

  useEffect(() => {
    fetchFactures();
  }, []);

  useEffect(() => {
    filterFactures();
  }, [factures, selectedStatus, selectedTvaRate, startDate, endDate]);

  const topTost = (type, message) => {
    MySwal.fire({
      icon: type,
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const fetchFactures = async () => {
    try {
      const response = await axios.get(`${config_url}/api/factures-achat`);
      const data = response.data.facturesAchat;

      const formattedData = data.map((facture) => {
        // Parse numeric values from the API response
        const totalHT = parseFloat(facture.totalHT) || 0;
        const totalTTC = parseFloat(facture.totalTTC) || 0;
        const tvaAmount = parseFloat(facture.tvaAmount) || 0;
        const tvaRate = parseFloat(facture.tvaRate) || 0;
        const advancement = parseFloat(facture.advancement) || 0;
        const remainingAmount =
          parseFloat(facture.remainingAmount) || totalTTC - advancement;

        return {
          ...facture,
          id: facture.id,
          num_facture: facture.invoiceNumber,
          date_creation: facture.issueDate,
          date_echeance: facture.dueDate,
          client: facture.supplierName,
          montant_ht: totalHT,
          tva: tvaAmount,
          tva_rate: tvaRate,
          montant_ttc: totalTTC,
          montant_restant: remainingAmount,
          advancement: advancement,
          status: facture.status,
          paymentType: facture.paymentType,
          created_at: facture.createdAt,
          lignes: facture.lignes,
          fornisseur: facture.fornisseur,
        };
      });

      setFactures(formattedData);
      calculateStatistics(formattedData);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      topTost("error", "Erreur lors du chargement des factures d'achat");
    }
  };

  const filterFactures = () => {
    let filtered = [...factures];

    if (selectedStatus !== "all") {
      filtered = filtered.filter((f) => f.status === selectedStatus);
    }

    if (selectedTvaRate !== "all") {
      filtered = filtered.filter(
        (f) => parseFloat(f.tva_rate) === parseFloat(selectedTvaRate),
      );
    }

    filtered = filtered.filter((f) => {
      const factureDate = new Date(f.date_creation);
      return factureDate >= startDate && factureDate <= endDate;
    });

    setFilteredFactures(filtered);
  };

  const calculateStatistics = (data) => {
    const stats = {
      totalFactures: data.length,
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0,
      totalAdvancements: 0,
      totalRemaining: 0,
      paidFactures: 0,
      draftFactures: 0,
      partiallyPaidFactures: 0,
      cancelledFactures: 0,
      averageHT: 0,
      averageTTC: 0,
      completionRate: 0,
      tvaByRate: { 0: 0, 7: 0, 10: 0, 14: 0, 20: 0 },
    };

    data.forEach((facture) => {
      stats.totalHT += parseFloat(facture.montant_ht) || 0;
      stats.totalTVA += parseFloat(facture.tva) || 0;
      stats.totalTTC += parseFloat(facture.montant_ttc) || 0;
      stats.totalAdvancements += parseFloat(facture.advancement) || 0;
      stats.totalRemaining += parseFloat(facture.montant_restant) || 0;

      if (facture.status === "payée") stats.paidFactures++;
      if (facture.status === "brouillon") stats.draftFactures++;
      if (facture.status === "partiellement_payée")
        stats.partiallyPaidFactures++;
      if (facture.status === "annulée") stats.cancelledFactures++;

      const tvaRate = parseFloat(facture.tva_rate) || 0;
      if (stats.tvaByRate.hasOwnProperty(tvaRate)) {
        stats.tvaByRate[tvaRate] += parseFloat(facture.tva) || 0;
      }
    });

    if (data.length > 0) {
      stats.averageHT = stats.totalHT / data.length;
      stats.averageTTC = stats.totalTTC / data.length;
      stats.completionRate = (stats.paidFactures / data.length) * 100;
    }

    setStatistics(stats);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      brouillon: { color: "secondary", label: "Brouillon" },
      envoyée: { color: "info", label: "Envoyée" },
      payée: { color: "success", label: "Payée" },
      partiellement_payée: { color: "warning", label: "Part. Payée" },
      en_retard: { color: "danger", label: "En Retard" },
      annulée: { color: "dark", label: "Annulée" },
    };

    const config = statusConfig[status] || {
      color: "secondary",
      label: status,
    };

    return (
      <Badge color={config.color} className="px-2 py-1">
        {config.label}
      </Badge>
    );
  };

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setDisplayStartDate(value);
      if (value) {
        setStartDate(new Date(value));
      }
    } else {
      setDisplayEndDate(value);
      if (value) {
        setEndDate(new Date(value));
      }
    }
  };

  const handleOpenModal = (facture) => {
    setSelectedInvoice(facture);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleDelete = async (id) => {
    try {
      const result = await MySwal.fire({
        title: "Êtes-vous sûr?",
        text: "Vous ne pourrez pas revenir en arrière!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Oui, supprimer!",
        cancelButtonText: "Annuler",
      });

      if (result.isConfirmed) {
        await axios.delete(`${config_url}/api/facture-achat/${id}`);
        topTost("success", "Facture supprimée avec succès");
        fetchFactures();
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      topTost("error", "Erreur lors de la suppression");
    }
  };

  // FIXED: Updated columns for TanStack Table v8 syntax
  const columns = useMemo(
    () => [
      {
        id: "num_facture",
        header: "N° Facture",
        accessorKey: "num_facture",
        cell: ({ row }) => (
          <Link
            to={`/facture-achat/${row.original.id}`}
            className="fw-bold text-primary text-decoration-none"
          >
            {row.original.num_facture}
          </Link>
        ),
      },
      {
        id: "date_creation",
        header: "Date",
        accessorKey: "date_creation",
        cell: ({ getValue }) => formatToFrenchDate(getValue()),
      },
      {
        id: "client",
        header: "Fournisseur",
        accessorKey: "client",
      },
      {
        id: "montant_ht",
        header: "Montant HT",
        accessorKey: "montant_ht",
        cell: ({ getValue }) => `${safeToFixed(getValue())} DH`,
      },
      {
        id: "tva",
        header: "TVA",
        accessorKey: "tva",
        cell: ({ getValue }) => `${safeToFixed(getValue())} DH`,
      },
      {
        id: "montant_ttc",
        header: "Montant TTC",
        accessorKey: "montant_ttc",
        cell: ({ getValue }) => (
          <span className="fw-bold">{safeToFixed(getValue())} DH</span>
        ),
      },
      {
        id: "montant_restant",
        header: "Restant",
        accessorKey: "montant_restant",
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span
              className={value > 0 ? "text-danger fw-bold" : "text-success"}
            >
              {safeToFixed(value)} DH
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Statut",
        accessorKey: "status",
        cell: ({ getValue }) => getStatusBadge(getValue()),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate(`/facture-achat/${row.original.id}`)}
              title="Voir les détails"
            >
              <FiEye size={14} />
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleDelete(row.original.id)}
              title="Supprimer"
            >
              <FiTrash size={14} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="page-title">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="page-title-text mb-0">Factures d'Achat</h3>
            <Link to="/facture-achat/create" className="btn btn-primary btn-md">
              <FiPlusCircle size={16} className="me-1" />
              Nouvelle Facture d'Achat
            </Link>
          </div>
        </div>
      </div>

      <Card className="mb-3">
        <CardBody>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Statut</label>
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Taux TVA</label>
              <select
                className="form-select"
                value={selectedTvaRate}
                onChange={(e) => setSelectedTvaRate(e.target.value)}
              >
                {tvaRateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Date début</label>
              <input
                type="date"
                className="form-control"
                value={formatDateForInput(startDate)}
                onChange={(e) => handleDateChange("start", e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Date fin</label>
              <input
                type="date"
                className="form-control"
                value={formatDateForInput(endDate)}
                onChange={(e) => handleDateChange("end", e.target.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="row mb-3">
        <div className="col-xl-3 col-sm-6">
          <div className="card radius-10 bg-purple">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="">
                  <p className="mb-1 text-black">Total Factures</p>
                  <h4 className="mb-0 text-black">
                    {safeToFixed(statistics.totalTTC)} DH
                  </h4>
                </div>
                <div className="ms-auto fs-2 text-white">
                  <FiFileText />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card radius-10 bg-success">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="">
                  <p className="mb-1 text-white-50">Payées</p>
                  <h4 className="mb-0 text-white">
                    {safeToFixed(
                      factures
                        .filter((f) => f.status === "payée")
                        .reduce(
                          (sum, f) => sum + (parseFloat(f.montant_ttc) || 0),
                          0,
                        ),
                    )}{" "}
                    DH
                  </h4>
                </div>
                <div className="ms-auto fs-2 text-white">
                  <FiCheckCircle />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card radius-10 bg-warning">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="">
                  <p className="mb-1 text-white-50">Restant</p>
                  <h4 className="mb-0 text-white">
                    {safeToFixed(statistics.totalRemaining)} DH
                  </h4>
                </div>
                <div className="ms-auto fs-2 text-white">
                  <FiClock />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card radius-10 bg-info">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="">
                  <p className="mb-1 text-white-50">TVA Collectée</p>
                  <h4 className="mb-0 text-white">
                    {safeToFixed(statistics.totalTVA)} DH
                  </h4>
                </div>
                <div className="ms-auto fs-2 text-white">
                  <FiPercent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <Table columns={columns} data={filteredFactures} />
        </CardBody>
      </Card>

      <FactureAchatDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={handleCloseModal}
        invoice={selectedInvoice}
        onUpdate={fetchFactures}
      />
    </div>
  );
};

export default FactureAchatTable;
