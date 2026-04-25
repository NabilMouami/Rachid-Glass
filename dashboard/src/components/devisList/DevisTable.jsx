import React, { useState, useEffect } from "react";
import axios from "axios";
import DevisDetailsModal from "./DevisDetailsModal";
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
  FiXCircle,
  FiSend,
  FiAlertCircle,
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
  { value: "envoyé", label: "Envoyé au client" },
  { value: "en_attente", label: "En Attente de réponse" },
  { value: "accepté", label: "Accepté par le client" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_facture", label: "Transformé en Facture" },
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

const DevisTable = () => {
  const [devis, setDevis] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState(null);

  // Date states (default: last 30 days)
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [displayStartDate, setDisplayStartDate] = useState(
    formatToFrenchDate(subDays(new Date(), 30)),
  );
  const [displayEndDate, setDisplayEndDate] = useState(
    formatToFrenchDate(new Date()),
  );

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalDevis: 0,
    totalAmount: 0,
    acceptedAmount: 0,
    draftDevis: 0,
    sentDevis: 0,
    acceptedDevis: 0,
    refusedDevis: 0,
    expiredDevis: 0,
    convertedDevis: 0,
    averageAmount: 0,
    conversionRate: 0,
  });
  const formatDateTime = (date) => {
    if (!date) return "";
    try {
      return format(date, "dd/MM/yyyy HH:mm");
    } catch (error) {
      return "";
    }
  };
  // Fetch data from YOUR API
  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const response = await axios.get(`${config_url}/api/devis`);
        const data = response.data;

        console.log("Data Devis: " + JSON.stringify(data));

        const formattedData = data.map((devis) => {
          const total = parseFloat(devis.total) || 0;

          return {
            id: devis.id,
            devisNumber: devis.devisNumber,
            customerName: devis.customerName,
            customerPhone: devis.customerPhone,
            total,
            status: devis.status,
            issueDate: new Date(devis.issueDate),
            issueDateString: formatDateTime(new Date(devis.issueDate)),
            validUntil: devis.validUntil ? new Date(devis.validUntil) : null,
            validUntilString: devis.validUntil
              ? formatToFrenchDate(new Date(devis.validUntil))
              : "Non définie",
            // Keep original data for modal
            originalData: devis,
          };
        });

        setDevis(formattedData);
        setFilteredDevis(formattedData);
        calculateStatistics(formattedData);
      } catch (error) {
        console.error("Error fetching devis:", error);
        setDevis([]);
        setFilteredDevis([]);
        resetStatistics();
      }
    };
    fetchDevis();
  }, []);

  // Calculate statistics
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      resetStatistics();
      return;
    }

    const totalDevis = data.length;
    const totalAmount = data.reduce(
      (sum, devis) => sum + (devis.total || 0),
      0,
    );

    const acceptedDevisData = data.filter(
      (devis) => devis.status === "accepté",
    );
    const acceptedAmount = acceptedDevisData.reduce(
      (sum, devis) => sum + (devis.total || 0),
      0,
    );

    const draftDevis = data.filter(
      (devis) => devis.status === "brouillon",
    ).length;
    const sentDevis = data.filter((devis) => devis.status === "envoyé").length;
    const acceptedDevis = acceptedDevisData.length;
    const refusedDevis = data.filter(
      (devis) => devis.status === "refusé",
    ).length;
    const expiredDevis = data.filter(
      (devis) => devis.status === "expiré",
    ).length;
    const convertedDevis = data.filter(
      (devis) => devis.status === "transformé_facture",
    ).length;

    const averageAmount = totalDevis > 0 ? totalAmount / totalDevis : 0;
    const conversionRate =
      totalDevis > 0 ? (acceptedDevis / totalDevis) * 100 : 0;

    setStatistics({
      totalDevis,
      totalAmount,
      acceptedAmount,
      draftDevis,
      sentDevis,
      acceptedDevis,
      refusedDevis,
      expiredDevis,
      convertedDevis,
      averageAmount,
      conversionRate,
    });
  };

  const resetStatistics = () => {
    setStatistics({
      totalDevis: 0,
      totalAmount: 0,
      acceptedAmount: 0,
      draftDevis: 0,
      sentDevis: 0,
      acceptedDevis: 0,
      refusedDevis: 0,
      expiredDevis: 0,
      convertedDevis: 0,
      averageAmount: 0,
      conversionRate: 0,
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
    let result = [...devis];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((devis) => devis.status === selectedStatus);
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((devis) => {
        const devisDate = new Date(devis.issueDate);
        return devisDate >= start && devisDate <= end;
      });
    }

    setFilteredDevis(result);
    calculateStatistics(result);
  }, [selectedStatus, startDate, endDate, devis]);

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      en_attente: "bg-info text-white",
      accepté: "bg-success text-white",
      refusé: "bg-danger text-white",
      expiré: "bg-dark text-white",
      transformé_facture: "bg-warning text-dark",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyé: "Envoyé",
      en_attente: "En Attente",
      accepté: "Accepté",
      refusé: "Refusé",
      expiré: "Expiré",
      transformé_facture: "Transformé en Facture",
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "brouillon":
        return <FiClock />;
      case "envoyé":
        return <FiSend />;
      case "en_attente":
        return <FiAlertCircle />;
      case "accepté":
        return <FiCheckCircle />;
      case "refusé":
        return <FiXCircle />;
      case "expiré":
        return <FiClock />;
      case "transformé_facture":
        return <FiFileText />;
      default:
        return <FiFileText />;
    }
  };

  const handleDevisUpdate = (updatedDevis) => {
    const updatedTotal = parseFloat(updatedDevis.total) || 0;

    setDevis((prev) =>
      prev.map((d) =>
        d.id === updatedDevis.id
          ? {
              ...d,
              customerName: updatedDevis.customerName || d.customerName,
              customerPhone: updatedDevis.customerPhone || d.customerPhone,
              status: updatedDevis.status || d.status,
              total: updatedTotal,
              originalData: {
                ...d.originalData,
                customerName:
                  updatedDevis.customerName || d.originalData.customerName,
                customerPhone:
                  updatedDevis.customerPhone || d.originalData.customerPhone,
                status: updatedDevis.status || d.originalData.status,
                total: updatedTotal,
              },
            }
          : d,
      ),
    );

    setFilteredDevis((prev) =>
      prev.map((d) =>
        d.id === updatedDevis.id
          ? {
              ...d,
              customerName: updatedDevis.customerName || d.customerName,
              customerPhone: updatedDevis.customerPhone || d.customerPhone,
              status: updatedDevis.status || d.status,
              total: updatedTotal,
              originalData: {
                ...d.originalData,
                customerName:
                  updatedDevis.customerName || d.originalData.customerName,
                customerPhone:
                  updatedDevis.customerPhone || d.originalData.customerPhone,
                status: updatedDevis.status || d.originalData.status,
                total: updatedTotal,
              },
            }
          : d,
      ),
    );

    MySwal.fire({
      title: <p>Succès</p>,
      text: "Devis mis à jour avec succès!",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleDeleteDevis = async (devisId) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Ce Devis</strong>?
        </p>
      ),
      text: "Êtes-vous sûr de vouloir supprimer ce devis?",
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
          `${config_url}/api/devis/${devisId}`,
          { withCredentials: true },
        );

        if (response.status === 200 || response.status === 204) {
          const newDevis = devis.filter((d) => d.id !== devisId);
          setDevis(newDevis);
          calculateStatistics(newDevis);
          MySwal.fire({
            title: <p>Supprimé!</p>,
            text: "Ce devis a été supprimé.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text: "Échec de la suppression du devis",
          icon: "error",
        });
      }
    }
  };

  const handleViewDevis = (devisId) => {
    axios
      .get(`${config_url}/api/devis/${devisId}`, {
        withCredentials: true,
      })
      .then((response) => {
        const devisData = response.data;
        setSelectedDevis(devisData);
        setIsDetailsModalOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching devis details:", error);
        MySwal.fire({
          title: <p>Erreur</p>,
          text: "Échec du chargement des détails du devis",
          icon: "error",
        });
      });
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
      accessorKey: "devisNumber",
      header: () => "N° Devis",
      cell: ({ getValue }) => (
        <span className="font-mono fw-bold">{getValue()}</span>
      ),
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
      cell: ({ getValue }) => <span className="fw-semibold">{getValue()}</span>,
    },
    {
      accessorKey: "total",
      header: () => "Montant",
      cell: ({ getValue }) => (
        <span className="fw-bold text-success">
          {safeToFixed(getValue())} Dh
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: () => "Statut",
      cell: ({ getValue }) => (
        <span
          className={`badge ${getStatusColor(getValue())} d-inline-flex align-items-center gap-1`}
        >
          {getStatusIcon(getValue())}
          <span>{getStatusText(getValue())}</span>
        </span>
      ),
    },
    {
      accessorKey: "issueDateString",
      header: () => "Date Creation",
    },
    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <div className="hstack d-flex gap-3 justify-content-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleViewDevis(row.original.id)}
            title="Voir détails"
          >
            <FiEye />
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDeleteDevis(row.original.id)}
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
          <Link to="/devis/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouveau Devis
            </button>
          </Link>
        </div>
      </div>

      {/* Period Info */}
      <div className="mb-2 text-muted small">
        <FiCalendar className="me-1" />
        Période : {displayStartDate} - {displayEndDate}
        <span className="ms-3 fw-bold">({filteredDevis.length} devis)</span>
      </div>

      {/* Statistics Cards */}
      <div className="mb-4" style={{ marginTop: "20px" }}>
        <div className="row g-3">
          {/* Total Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Devis</h6>
                  <h3 className="mb-0">{statistics.totalDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Total Amount */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant Total</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.totalAmount)} Dh
                  </h3>
                  <small className="text-muted">
                    Moy: {safeToFixed(statistics.averageAmount)} Dh
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Accepted Amount */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Montant Accepté</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.acceptedAmount)} Dh
                  </h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Conversion Rate */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiPercent className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Taux Conversion</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.conversionRate, 1)}%
                  </h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Draft Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiClock className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Brouillons</h6>
                  <h3 className="mb-0">{statistics.draftDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sent Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiSend className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Envoyés</h6>
                  <h3 className="mb-0">{statistics.sentDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Accepted Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Acceptés</h6>
                  <h3 className="mb-0">{statistics.acceptedDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Refused Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <FiXCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Refusés</h6>
                  <h3 className="mb-0">{statistics.refusedDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Expired Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-dark bg-opacity-10 rounded-circle p-3 me-3">
                  <FiClock className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Expirés</h6>
                  <h3 className="mb-0">{statistics.expiredDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Converted Devis */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Transformés en Facture</h6>
                  <h3 className="mb-0">{statistics.convertedDevis}</h3>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        <Table data={filteredDevis} columns={columns} />
      </div>

      {/* Modal */}
      <DevisDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        onUpdate={handleDevisUpdate}
        devis={selectedDevis}
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
        .font-mono {
          font-family: monospace;
        }
      `}</style>
    </>
  );
};

export default DevisTable;
