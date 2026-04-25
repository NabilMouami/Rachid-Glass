import React, { useState, useEffect } from "react";
import axios from "axios";
import BonLivrDetailsModal from "./BonLivrDetailsModal";
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
const BonLivraisonTable = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState("brouillon");

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
    totalBons: 0,
    totalAmount: 0,
    totalAdvancements: 0,
    totalRemaining: 0,
    paidBons: 0,
    draftBons: 0,
    partiallyPaidBons: 0,
    cancelledBons: 0,
    averageAmount: 0,
    completionRate: 0,
    paidBonsAmount: 0,
    paidBonsTotalAmount: 0,
  });

  // Fetch data from YOUR API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`${config_url}/api/bonlivraisons`);
        const data = response.data;
        const formattedData = data.map((invoice) => {
          const total = parseFloat(invoice.total) || 0;
          const advancement = parseFloat(invoice.advancement) || 0;
          const remainingAmount =
            parseFloat(invoice.remainingAmount) || total - advancement;

          return {
            id: invoice.id,
            deliveryNumber: invoice.deliveryNumber,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            total,
            advancement,
            remainingAmount,
            status: invoice.status,
            createdAt: new Date(invoice.createdAt),
            createdAtString: formatDateTime(new Date(invoice.createdAt)),
            // Keep original data for modal
            originalData: invoice,
          };
        });

        setBookings(formattedData);
        setFilteredBookings(formattedData);
        calculateStatistics(formattedData);
      } catch (error) {
        console.error("Error fetching bons:", error);
        setBookings([]);
        setFilteredBookings([]);
        resetStatistics();
      }
    };
    fetchBookings();
  }, []);

  // Calculate statistics
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      resetStatistics();
      return;
    }

    const totalBons = data.length;
    const totalAmount = data.reduce((sum, bon) => sum + (bon.total || 0), 0);
    const totalAdvancements = data.reduce(
      (sum, bon) => sum + (bon.advancement || 0),
      0,
    );

    // Calculate remaining based on status logic
    const totalRemaining = data.reduce((sum, bon) => {
      if (bon.status === "annulée") return sum + 0;
      if (bon.status === "payée") return sum + 0;
      return sum + (bon.remainingAmount || 0);
    }, 0);

    const paidBons = data.filter((bon) => bon.status === "payée").length;
    const draftBons = data.filter((bon) => bon.status === "brouillon").length;
    const partiallyPaidBons = data.filter(
      (bon) => bon.status === "partiellement_payée",
    ).length;
    const cancelledBons = data.filter((bon) => bon.status === "annulée").length;

    // Calculate paid amount for "Partiellement Payée" and "Payée" status only
    const paidBonsAmount = data.reduce((sum, bon) => {
      if (bon.status === "payée") {
        // For fully paid, the entire total is the paid amount
        return sum + (bon.total || 0);
      } else if (bon.status === "partiellement_payée") {
        // For partially paid, use the advancement
        return sum + (bon.advancement || 0);
      }
      return sum;
    }, 0);

    // Calculate total amount for "Partiellement Payée" and "Payée" status only
    const paidBonsTotalAmount = data.reduce((sum, bon) => {
      if (bon.status === "partiellement_payée" || bon.status === "payée") {
        return sum + (bon.total || 0);
      }
      return sum;
    }, 0);

    const averageAmount = totalBons > 0 ? totalAmount / totalBons : 0;
    const completionRate =
      totalAmount > 0 ? (totalAdvancements / totalAmount) * 100 : 0;

    setStatistics({
      totalBons,
      totalAmount,
      totalAdvancements,
      totalRemaining,
      paidBons,
      draftBons,
      partiallyPaidBons,
      cancelledBons,
      averageAmount,
      completionRate,
      paidBonsAmount,
      paidBonsTotalAmount,
    });
  };

  const resetStatistics = () => {
    setStatistics({
      totalBons: 0,
      totalAmount: 0,
      totalAdvancements: 0,
      totalRemaining: 0,
      paidBons: 0,
      draftBons: 0,
      partiallyPaidBons: 0,
      cancelledBons: 0,
      averageAmount: 0,
      completionRate: 0,
      paidBonsAmount: 0,
      paidBonsTotalAmount: 0,
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

  // Filter logic
  useEffect(() => {
    let result = [...bookings];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((bon) => bon.status === selectedStatus);
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((bon) => {
        const bonDate = new Date(bon.createdAt);
        return bonDate >= start && bonDate <= end;
      });
    }

    setFilteredBookings(result);
    calculateStatistics(result);
  }, [selectedStatus, startDate, endDate, bookings]);

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

  const handleInvoiceUpdate = (updatedInvoice) => {
    const newTotal = parseFloat(updatedInvoice.total) || 0;
    const newAdvancement =
      parseFloat(updatedInvoice.advancement) ||
      parseFloat(updatedInvoice.totalAdvancement) ||
      0;
    const newRemainingAmount =
      parseFloat(updatedInvoice.remainingAmount) || newTotal - newAdvancement;

    setBookings((prev) =>
      prev.map((bon) =>
        bon.id === updatedInvoice.id
          ? {
              ...bon,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              total: newTotal,
              advancement: newAdvancement,
              remainingAmount: newRemainingAmount,
            }
          : bon,
      ),
    );

    setFilteredBookings((prev) =>
      prev.map((bon) =>
        bon.id === updatedInvoice.id
          ? {
              ...bon,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              total: newTotal,
              advancement: newAdvancement,
              remainingAmount: newRemainingAmount,
            }
          : bon,
      ),
    );

    MySwal.fire({
      title: <p>Succès</p>,
      text: "Bon Livraison mise à jour avec succès!",
      icon: "success",
    });
  };

  const handleDeleteEmployee = async (bookId) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Cette Bon Livraison</strong>?
        </p>
      ),
      text: "Etes-vous sûr de vouloir supprimer ceci Bon Livraison?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `${config_url}/api/bonlivraisons/${bookId}`,
          { withCredentials: true },
        );

        if (response.status === 200 || response.status === 204) {
          const newBookings = bookings.filter((book) => book.id !== bookId);
          setBookings(newBookings);
          calculateStatistics(newBookings);
          MySwal.fire({
            title: <p>Supprimé!</p>,
            text: `Cette Bon Livraison a été supprimée.`,
            icon: "success",
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        MySwal.fire({
          title: <p>Error</p>,
          text: "Failed to delete Bon Livraison",
          icon: "error",
        });
      }
    }
  };

  const handleViewInvoice = (invoiceId) => {
    axios
      .get(`${config_url}/api/bonlivraisons/${invoiceId}`, {
        withCredentials: true,
      })
      .then((response) => {
        const invoiceData = response.data;
        setSelectedInvoice({
          ...invoiceData,
          advancement: invoiceData.advancement || 0,
          remainingAmount: invoiceData.remainingAmount || invoiceData.total,
        });
        setAdvancementPrice(invoiceData.advancement || 0);
        setInvoiceStatus(invoiceData.status || "brouillon");
        setIsDetailsModalOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching invoice details:", error);
        MySwal.fire({
          title: <p>Error</p>,
          text: "Failed to load invoice details",
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
      accessorKey: "deliveryNumber",
      header: () => "N° Bon Livraison",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
    },
    {
      accessorKey: "total",
      header: () => "Total",
      cell: ({ getValue }) => <span>{safeToFixed(getValue())} Dh</span>,
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
      accessorKey: "createdAtString",
      header: () => "Date de Création",
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
            onClick={() => handleDeleteEmployee(row.original.id)}
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
          <Link to="/bon-livraison/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouvelle Bon Livraison
            </button>
          </Link>
        </div>
      </div>

      {/* Period Info */}
      <div className="mb-2 text-muted small">
        <FiCalendar className="me-1" />
        Période : {displayStartDate} - {displayEndDate}
        <span className="ms-3">({filteredBookings.length} bons)</span>
      </div>

      {/* Statistics Cards */}
      <div className="mb-4" style={{ marginTop: "20px" }}>
        <div className="row g-3">
          {/* Total Bons */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiFileText className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Bons</h6>
                  <h3 className="mb-0">{statistics.totalBons}</h3>
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

          {/* Total Payed */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <FiDollarSign className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Payé</h6>
                  <h3 className="mb-0">
                    {safeToFixed(statistics.paidBonsAmount)} Dh
                  </h3>
                  <small className="text-muted">
                    {statistics.paidBonsTotalAmount > 0
                      ? `${((statistics.paidBonsAmount / statistics.paidBonsTotalAmount) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Paid Bons */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <FiCheckCircle className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bons Payés</h6>
                  <h3 className="mb-0">{statistics.paidBons}</h3>
                  <small className="text-muted">
                    {statistics.totalBons > 0
                      ? `${((statistics.paidBons / statistics.totalBons) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Draft Bons */}
          <div className="col-xl-3 col-lg-4 col-md-6">
            <Card className="border-0 shadow-sm h-100">
              <CardBody className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                  <FiClock className="text-white fs-3" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Brouillons</h6>
                  <h3 className="mb-0">{statistics.draftBons}</h3>
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
                  <h3 className="mb-0">{statistics.partiallyPaidBons}</h3>
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
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        <Table data={filteredBookings} columns={columns} />
      </div>

      {/* Modal */}
      <BonLivrDetailsModal
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

export default BonLivraisonTable;
