import React, { useState, useEffect } from "react";
import axios from "axios";
import FactureDetailsModal from "./FactureDetailsModal";
import Table from "@/components/shared/table/Table";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays } from "date-fns";
import {
  FiEye,
  FiFilter,
  FiCalendar,
  FiPlusCircle,
  FiTrash,
  FiDollarSign,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiPercent,
  FiBarChart2,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Card, CardBody } from "reactstrap";
import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";

const MySwal = withReactContent(Swal);

// Status options mapped to your API
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
  { value: "en_attente", label: "En Attente" },
];

// TVA rate filter options
const tvaRateOptions = [
  { value: "all", label: "Tous les taux" },
  { value: 0, label: "0% (Exonéré)" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 14, label: "14%" },
  { value: 20, label: "20%" },
];

// Helper to format numbers safely
const safeToFixed = (value, decimals = 2) => {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return "0." + "0".repeat(decimals);
  }
  return value.toFixed(decimals);
};

// Helper to format date for input[type=date]
const formatDateForInput = (date) => {
  if (!date) return "";
  try {
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    return "";
  }
};

// Helper to format date for display (French)
const formatToFrenchDate = (date) => {
  if (!date) return "";
  try {
    return format(date, "dd/MM/yyyy");
  } catch (error) {
    return "";
  }
};

// Helper to format date with time
const formatDateTime = (date) => {
  if (!date) return "";
  try {
    return format(date, "dd/MM/yyyy HH:mm");
  } catch (error) {
    return "";
  }
};

const FactureTable = () => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTvaRate, setSelectedTvaRate] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Date states (default: last 30 days)
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [displayStartDate, setDisplayStartDate] = useState(
    formatToFrenchDate(subDays(new Date(), 30)),
  );
  const [displayEndDate, setDisplayEndDate] = useState(
    formatToFrenchDate(new Date()),
  );

  // Statistics state with TVA
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

  // Fetch data from API
  useEffect(() => {
    const fetchFactures = async () => {
      try {
        const response = await axios.get(`${config_url}/api/factures`);
        const data = response.data.factures;

        console.log("Data Factures: " + JSON.stringify(data));

        const formattedData = data.map((facture) => {
          const totalHT = parseFloat(facture.totalHT) || 0;
          const totalTTC = parseFloat(facture.totalTTC) || 0;
          const tvaAmount = parseFloat(facture.tvaAmount) || 0;
          const tvaRate = parseFloat(facture.tvaRate) || 0;
          const advancement = parseFloat(facture.advancement) || 0;
          const remainingAmount =
            parseFloat(facture.remainingAmount) || totalTTC - advancement;

          return {
            id: facture.id,
            invoiceNumber: facture.invoiceNumber,
            customerName: facture.customerName,
            customerPhone: facture.customerPhone,
            totalHT,
            totalTTC,
            tvaAmount,
            tvaRate,
            advancement,
            remainingAmount,
            status: facture.status,
            issueDate: new Date(facture.issueDate),
            issueDateString: formatDateTime(new Date(facture.issueDate)),
            createdAt: new Date(facture.createdAt),
            createdAtString: formatDateTime(new Date(facture.createdAt)),
            // Keep original data for modal
            originalData: facture,
          };
        });

        setFactures(formattedData);
        setFilteredFactures(formattedData);
        calculateStatistics(formattedData);
      } catch (error) {
        console.error("Error fetching factures:", error);
        setFactures([]);
        setFilteredFactures([]);
        resetStatistics();
      }
    };
    fetchFactures();
  }, []);

  // Calculate statistics with TVA
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      resetStatistics();
      return;
    }

    const totalFactures = data.length;
    const totalHT = data.reduce(
      (sum, facture) => sum + (facture.totalHT || 0),
      0,
    );
    const totalTTC = data.reduce(
      (sum, facture) => sum + (facture.totalTTC || 0),
      0,
    );
    const totalTVA = data.reduce(
      (sum, facture) => sum + (facture.tvaAmount || 0),
      0,
    );
    const totalAdvancements = data.reduce(
      (sum, facture) => sum + (facture.advancement || 0),
      0,
    );

    // Calculate remaining based on status logic
    const totalRemaining = data.reduce((sum, facture) => {
      if (facture.status === "annulée") return sum + 0;
      if (facture.status === "payée") return sum + 0;
      return sum + (facture.remainingAmount || 0);
    }, 0);

    const paidFactures = data.filter(
      (facture) => facture.status === "payée",
    ).length;
    const draftFactures = data.filter(
      (facture) => facture.status === "brouillon",
    ).length;
    const partiallyPaidFactures = data.filter(
      (facture) => facture.status === "partiellement_payée",
    ).length;
    const cancelledFactures = data.filter(
      (facture) => facture.status === "annulée",
    ).length;

    const averageHT = totalFactures > 0 ? totalHT / totalFactures : 0;
    const averageTTC = totalFactures > 0 ? totalTTC / totalFactures : 0;
    const completionRate =
      totalTTC > 0 ? (totalAdvancements / totalTTC) * 100 : 0;

    // Calculate TVA by rate
    const tvaByRate = {
      0: data
        .filter((f) => f.tvaRate === 0)
        .reduce((sum, f) => sum + (f.tvaAmount || 0), 0),
      7: data
        .filter((f) => f.tvaRate === 7)
        .reduce((sum, f) => sum + (f.tvaAmount || 0), 0),
      10: data
        .filter((f) => f.tvaRate === 10)
        .reduce((sum, f) => sum + (f.tvaAmount || 0), 0),
      14: data
        .filter((f) => f.tvaRate === 14)
        .reduce((sum, f) => sum + (f.tvaAmount || 0), 0),
      20: data
        .filter((f) => f.tvaRate === 20)
        .reduce((sum, f) => sum + (f.tvaAmount || 0), 0),
    };

    setStatistics({
      totalFactures,
      totalHT,
      totalTVA,
      totalTTC,
      totalAdvancements,
      totalRemaining,
      paidFactures,
      draftFactures,
      partiallyPaidFactures,
      cancelledFactures,
      averageHT,
      averageTTC,
      completionRate,
      tvaByRate,
    });
  };

  const resetStatistics = () => {
    setStatistics({
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
      tvaByRate: { 0: 0, 7: 0, 10: 0, 14: 0, 20: 0 },
    });
  };

  // Date handlers
  const handleStartDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (date) {
      date.setHours(0, 0, 0, 0);
      setStartDate(date);
      setDisplayStartDate(formatToFrenchDate(date));
    }
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (date) {
      date.setHours(23, 59, 59, 999);
      setEndDate(date);
      setDisplayEndDate(formatToFrenchDate(date));
    }
  };

  const resetDateFilter = () => {
    const newStart = subDays(new Date(), 30);
    const newEnd = new Date();
    setStartDate(newStart);
    setEndDate(newEnd);
    setDisplayStartDate(formatToFrenchDate(newStart));
    setDisplayEndDate(formatToFrenchDate(newEnd));
  };

  // Filter logic
  useEffect(() => {
    let result = [...factures];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((facture) => facture.status === selectedStatus);
    }

    // Filter by TVA rate
    if (selectedTvaRate !== "all") {
      result = result.filter(
        (facture) => facture.tvaRate === parseFloat(selectedTvaRate),
      );
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((facture) => {
        const factureDate = new Date(facture.issueDate);
        return factureDate >= start && factureDate <= end;
      });
    }

    setFilteredFactures(result);
    calculateStatistics(result);
  }, [selectedStatus, selectedTvaRate, startDate, endDate, factures]);

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyée: "bg-primary text-white",
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
      brouillon: "Brouillon",
      envoyée: "Envoyée",
      payée: "Payée",
      partiellement_payée: "Partiellement Payée",
      en_retard: "En Retard",
      annulée: "Annulée",
      en_attente: "En Attente",
    };
    return texts[status] || status;
  };

  const getTvaBadgeColor = (rate) => {
    const colors = {
      0: "bg-secondary",
      7: "bg-info",
      10: "bg-primary",
      14: "bg-warning",
      20: "bg-success",
    };
    return colors[rate] || "bg-secondary";
  };

  const handleInvoiceUpdate = (updatedInvoice) => {
    setFactures((prev) =>
      prev.map((facture) =>
        facture.id === updatedInvoice.id
          ? {
              ...facture,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              advancement: updatedInvoice.advancement || 0,
              remainingAmount:
                updatedInvoice.remainingAmount || updatedInvoice.totalTTC,
              tvaRate: updatedInvoice.tvaRate || facture.tvaRate,
            }
          : facture,
      ),
    );

    setFilteredFactures((prev) =>
      prev.map((facture) =>
        facture.id === updatedInvoice.id
          ? {
              ...facture,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              advancement: updatedInvoice.advancement || 0,
              remainingAmount:
                updatedInvoice.remainingAmount || updatedInvoice.totalTTC,
              tvaRate: updatedInvoice.tvaRate || facture.tvaRate,
            }
          : facture,
      ),
    );

    MySwal.fire({
      title: <p>Succès</p>,
      text: "Facture mise à jour avec succès!",
      icon: "success",
    });
  };

  const handleDeleteFacture = async (factureId) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Cette Facture</strong>?
        </p>
      ),
      text: "Etes-vous sûr de vouloir supprimer cette facture?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `${config_url}/api/factures/${factureId}`,
          { withCredentials: true },
        );

        if (response.status === 200 || response.status === 204) {
          const newFactures = factures.filter(
            (facture) => facture.id !== factureId,
          );
          setFactures(newFactures);
          calculateStatistics(newFactures);
          MySwal.fire({
            title: <p>Supprimé!</p>,
            text: `Cette facture a été supprimée.`,
            icon: "success",
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text: "Échec de la suppression de la facture",
          icon: "error",
        });
      }
    }
  };

  const handleViewInvoice = (invoiceId) => {
    const invoice = factures.find((facture) => facture.id === invoiceId);
    if (invoice) {
      axios
        .get(`${config_url}/api/factures/${invoiceId}`, {
          withCredentials: true,
        })
        .then((response) => {
          const invoiceData = response.data.facture;
          setSelectedInvoice({
            ...invoiceData,
            advancement: invoiceData.advancement || 0,
            remainingAmount:
              invoiceData.remainingAmount || invoiceData.totalTTC,
          });
          setIsDetailsModalOpen(true);
        })
        .catch((error) => {
          console.error("Error fetching invoice details:", error);
          MySwal.fire({
            title: <p>Erreur</p>,
            text: "Échec du chargement des détails de la facture",
            icon: "error",
          });
        });
    }
  };

  const columns = [
    {
      accessorKey: "id",
      header: ({ table }) => {
        const checkboxRef = React.useRef(null);
        React.useEffect(() => {
          if (checkboxRef.current) {
            checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
          }
        }, [table.getIsSomeRowsSelected()]);

        return (
          <input
            type="checkbox"
            className="custom-table-checkbox"
            ref={checkboxRef}
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="custom-table-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      meta: { headerClassName: "width-30" },
    },
    {
      accessorKey: "invoiceNumber",
      header: () => "N° Facture",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
    },
    {
      accessorKey: "totalHT",
      header: () => "Total HT",
      cell: ({ getValue }) => <span>{safeToFixed(getValue())} Dh</span>,
    },
    {
      accessorKey: "tvaRate",
      header: () => "TVA",
      cell: ({ row }) => {
        const rate = row.original.tvaRate;
        const amount = row.original.tvaAmount;
        return (
          <div>
            <span className={`badge ${getTvaBadgeColor(rate)} me-2`}>
              {rate}%
            </span>
            <small className="text-muted">{safeToFixed(amount)} Dh</small>
          </div>
        );
      },
    },
    {
      accessorKey: "totalTTC",
      header: () => "Total TTC",
      cell: ({ getValue }) => (
        <span className="fw-bold">{safeToFixed(getValue())} Dh</span>
      ),
    },
    {
      accessorKey: "advancement",
      header: () => "Avancement",
      cell: ({ getValue }) => <span>{safeToFixed(getValue() || 0)} Dh</span>,
    },
    {
      accessorKey: "remainingAmount",
      header: () => "Reste à Payer",
      cell: ({ getValue }) => {
        const amount = getValue() || 0;
        return (
          <span className={amount > 0 ? "text-danger" : "text-success"}>
            {safeToFixed(amount)} Dh
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => "Statut",
      cell: ({ getValue }) => (
        <span className={`badge ${getStatusColor(getValue())}`}>
          {getStatusText(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "issueDateString",
      header: () => "Date Facture",
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <div className="hstack d-flex gap-3 justify-content-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleViewInvoice(row.original.id)}
            title="Voir détails"
          >
            <FiEye />
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDeleteFacture(row.original.id)}
            title="Supprimer"
          >
            <FiTrash />
          </button>
        </div>
      ),
      meta: { headerClassName: "text-center" },
    },
  ];

  return (
    <>
      {/* Filters Section */}
      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{ zIndex: 999 }}
      >
        {/* Status Filter */}
        <InputGroup size="sm" className="w-auto shadow-sm rounded">
          <InputGroupText className="bg-white border-0">
            <FiFilter className="text-primary fs-6" />
          </InputGroupText>
          <Input
            type="select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border-0 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
        </InputGroup>

        {/* TVA Rate Filter */}
        <InputGroup size="sm" className="w-auto shadow-sm rounded">
          <InputGroupText className="bg-white border-0">
            <FiPercent className="text-primary fs-6" />
          </InputGroupText>
          <Input
            type="select"
            value={selectedTvaRate}
            onChange={(e) => setSelectedTvaRate(e.target.value)}
            className="border-0 bg-white"
          >
            {tvaRateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
        </InputGroup>

        {/* Date Range Filter */}
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <InputGroup size="sm" className="w-auto shadow-sm rounded">
              <div className="position-relative">
                <Input
                  type="date"
                  className="border-0 bg-white date-input-custom"
                  value={formatDateForInput(startDate)}
                  onChange={handleStartDateChange}
                  max={formatDateForInput(endDate)}
                  style={{ padding: "20px", width: "140px" }}
                />
                <span
                  className="position-absolute top-50 start-0 translate-middle-y ms-5 ps-4 text-muted"
                  style={{ pointerEvents: "none", zIndex: 10 }}
                >
                  {displayStartDate}
                </span>
              </div>
            </InputGroup>
          </div>

          <span className="text-muted">à</span>

          <div className="position-relative">
            <InputGroup size="sm" className="w-auto shadow-sm rounded">
              <div className="position-relative">
                <Input
                  type="date"
                  className="border-0 bg-white date-input-custom"
                  value={formatDateForInput(endDate)}
                  onChange={handleEndDateChange}
                  min={formatDateForInput(startDate)}
                  style={{ padding: "20px", width: "140px" }}
                />
                <span
                  className="position-absolute top-50 start-0 translate-middle-y ms-5 ps-4 text-muted"
                  style={{ pointerEvents: "none", zIndex: 10 }}
                >
                  {displayEndDate}
                </span>
              </div>
            </InputGroup>
          </div>
        </div>

        {/* Create Button */}
        <div>
          <Link to="/factures/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouvelle Facture
            </button>
          </Link>
        </div>
      </div>

      {/* Period Info */}
      <div className="mb-2 text-muted small">
        <FiCalendar className="me-1" />
        Période : {displayStartDate} - {displayEndDate}
        <span className="ms-3">({filteredFactures.length} factures)</span>
      </div>

      {/* Statistics Cards */}
      <div className="mb-4" style={{ marginTop: "20px" }}>
        <div className="row g-3">
          {/* Total Factures */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Factures</h6>
                  <h3 className="mb-0">{statistics.totalFactures}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total HT */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiBarChart2 className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total HT</h6>
                  <h3 className="mb-0">{safeToFixed(statistics.totalHT)} Dh</h3>
                  <small className="text-muted">
                    Moy: {safeToFixed(statistics.averageHT)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total TVA */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                  <FiPercent className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total TVA</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalTVA)} Dh
                  </h3>
                  <small className="text-muted">
                    20%: {safeToFixed(statistics.tvaByRate[20])} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total TTC */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total TTC</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalTTC)} Dh
                  </h3>
                  <small className="text-muted">
                    Moy: {safeToFixed(statistics.averageTTC)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Paid Factures */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Factures Payées</h6>
                  <h3 className="mb-0">{statistics.paidFactures}</h3>
                  <small className="text-muted">
                    {statistics.totalFactures > 0
                      ? `${((statistics.paidFactures / statistics.totalFactures) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Draft Factures */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiClock className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Brouillons</h6>
                  <h3 className="mb-0">{statistics.draftFactures}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Partially Paid */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                  <FiTrendingUp className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Partiellement Payés</h6>
                  <h3 className="mb-0">{statistics.partiallyPaidFactures}</h3>
                  <small className="text-muted">
                    {safeToFixed(statistics.totalAdvancements)} Dh avancés
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Remaining */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Reste à Payer</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalRemaining)} Dh
                  </h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Completion Rate */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiPercent className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Taux Paiement</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.completionRate, 1)}%
                  </h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Cancelled */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-dark bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Annulés</h6>
                  <h3 className="mb-0">{statistics.cancelledFactures}</h3>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        <Table data={filteredFactures} columns={columns} />
      </div>

      {/* Modal */}
      <FactureDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        onUpdate={handleInvoiceUpdate}
        invoice={selectedInvoice}
      />

      <style jsx>{`
        .date-input-custom {
          position: relative;
          color: transparent !important;
          cursor: pointer;
        }
        .date-input-custom::-webkit-calendar-picker-indicator {
          position: absolute;
          left: 5px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 1;
          cursor: pointer;
          width: 20px;
          height: 20px;
        }
        .date-input-custom::-webkit-datetime-edit {
          display: none;
        }
      `}</style>
    </>
  );
};

export default FactureTable;
