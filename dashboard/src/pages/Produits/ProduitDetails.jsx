import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import { config_url } from "@/utils/config";

import topTost from "@/utils/topTost";

import {
  FiPackage,
  FiTruck,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiMapPin,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPercent,
  FiX,
  FiBox,
  FiTrendingUp,
  FiUsers,
  FiPhone,
  FiArrowLeft,
  FiUser,
  FiBarChart2,
} from "react-icons/fi";

const CHART = {
  fontFamily: "inherit",
  toolbar: { show: false },
  animations: { enabled: true, speed: 400 },
};

function ProduitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [produit, setProduit] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [draftFilters, setDraftFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [activeFilters, setActiveFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [groupBy, setGroupBy] = useState("week");
  const [filterLoading, setFilterLoading] = useState(false);
  const hasLoadedRef = React.useRef(false);
  const prevIdRef = React.useRef(id);

  const filterKey = `${activeFilters.startDate}|${activeFilters.endDate}|${groupBy}`;

  const fetchHistory = useCallback(
    async (filters, periodGroup, showToast = false) => {
      try {
        if (hasLoadedRef.current) setFilterLoading(true);
        else setLoading(true);

        const params = {
          documentType: "bon-livraison",
          groupBy: periodGroup,
          limit: 10000,
        };
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;

        const historyRes = await axios.get(
          `${config_url}/api/produits/${id}/history`,
          { params, withCredentials: true },
        );

        setProduit(historyRes.data.produit);
        setHistoryData(historyRes.data);
        hasLoadedRef.current = true;

        if (showToast) {
          const blCount =
            historyRes.data.documents?.byType?.bonLivraisons?.length || 0;
          topTost(`${blCount} bon(s) de livraison trouvé(s)`, "success");
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        topTost(
          error.response?.data?.message ||
            "Erreur lors du chargement des données",
          "error",
        );
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      hasLoadedRef.current = false;
      const empty = { startDate: "", endDate: "" };
      setDraftFilters(empty);
      setActiveFilters(empty);
      setGroupBy("week");
      fetchHistory(empty, "week");
      return;
    }

    fetchHistory(activeFilters, groupBy);
  }, [id, filterKey, activeFilters, groupBy, fetchHistory]);

  const applyDateFilter = () => {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      topTost("La date de début doit être avant la date de fin", "warning");
      return;
    }

    setActiveFilters({
      startDate: draftFilters.startDate,
      endDate: draftFilters.endDate,
    });
    topTost("Filtre appliqué à toute la page", "success");
  };

  const resetFilters = () => {
    const empty = { startDate: "", endDate: "" };
    setDraftFilters(empty);
    setActiveFilters(empty);
    topTost("Filtre réinitialisé — toute la période", "info");
  };

  const setPresetRange = (presetType) => {
    const now = new Date();
    let start = "";
    let end = "";

    const formatDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    switch (presetType) {
      case "today": {
        start = formatDateString(now);
        end = formatDateString(now);
        break;
      }
      case "week": {
        const currentDay = now.getDay();
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = formatDateString(monday);
        end = formatDateString(sunday);
        break;
      }
      case "month": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        start = formatDateString(firstDay);
        end = formatDateString(lastDay);
        break;
      }
      case "year": {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        const lastDay = new Date(now.getFullYear(), 11, 31);
        start = formatDateString(firstDay);
        end = formatDateString(lastDay);
        break;
      }
      case "all":
      default: {
        start = "";
        end = "";
        break;
      }
    }

    setDraftFilters({ startDate: start, endDate: end });
    setActiveFilters({ startDate: start, endDate: end });
    topTost(
      presetType === "all"
        ? "Filtre réinitialisé — toute la période"
        : `Période appliquée : ${
            presetType === "today"
              ? "Aujourd'hui"
              : presetType === "week"
                ? "Cette semaine"
                : presetType === "month"
                  ? "Ce mois"
                  : "Cette année"
          }`,
      "success",
    );
  };

  const handleGroupByChange = (value) => {
    setGroupBy(value);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      envoyé: "bg-primary text-white",
      payé: "bg-success text-white",
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
      payé: "Payé",
      payée: "Payée",
      partiellement_payée: "Partiellement Payé",
      annulée: "Annulé",
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "payée":
      case "payé":
      case "accepté":
        return <FiCheckCircle className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      case "partiellement_payée":
        return <FiPercent className="me-1" />;
      case "annulée":
      case "refusé":
        return <FiXCircle className="me-1" />;
      default:
        return <FiClock className="me-1" />;
    }
  };

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

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0,00 MAD";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const parseQuantity = (qty) => {
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") return parseFloat(qty) || 0;
    return 0;
  };

  const formatFilterPeriod = (filters) => {
    if (!filters?.startDate && !filters?.endDate) return "Toute la période";
    if (filters.startDate && filters.endDate) {
      return `${formatDate(filters.startDate)} → ${formatDate(filters.endDate)}`;
    }
    if (filters.startDate)
      return `À partir du ${formatDate(filters.startDate)}`;
    return `Jusqu'au ${formatDate(filters.endDate)}`;
  };

  const handleViewDocument = (docId) => {
    if (docId) navigate(`/bon-livraisons/${docId}`);
  };

  const chartData = historyData?.chartData;
  const salesByPeriod =
    chartData?.salesByPeriod || chartData?.salesByMonth || [];
  const salesByClient = chartData?.salesByClient || historyData?.clients || [];
  const clientsByRevenue = useMemo(
    () =>
      [...salesByClient].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)),
    [salesByClient],
  );
  const topClientsByMetreLin =
    chartData?.topClientsByMetreLin ||
    [...salesByClient]
      .sort((a, b) => (b.metreLineaire || 0) - (a.metreLineaire || 0))
      .slice(0, 10);
  const periodLabel = groupBy === "month" ? "Mois" : "Semaine";

  const periodChartOptions = useMemo(
    () => ({
      chart: { ...CHART, type: "bar" },
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: "55%" },
      },
      colors: ["#4361ee", "#06b6d4"],
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        categories: salesByPeriod.map((m) => m.label),
        labels: { rotate: -45, style: { fontSize: "11px" } },
      },
      yaxis: [
        {
          title: { text: "Mètre Lin (ML)" },
          labels: { formatter: (v) => parseFloat(v).toFixed(2) },
        },
        {
          opposite: true,
          title: { text: "Montant (MAD)" },
          labels: { formatter: (v) => `${Math.round(v)}` },
        },
      ],
      legend: { position: "top" },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val, { seriesIndex }) =>
            seriesIndex === 0
              ? `${parseFloat(val).toFixed(2)} ML`
              : formatCurrency(val),
        },
      },
    }),
    [salesByPeriod],
  );

  const periodChartSeries = useMemo(
    () => [
      {
        name: "Mètre Lin",
        type: "column",
        data: salesByPeriod.map((m) => m.metreLineaire ?? 0),
      },
      {
        name: "Montant",
        type: "line",
        data: salesByPeriod.map((m) => m.revenue),
      },
    ],
    [salesByPeriod],
  );

  const clientChartOptions = useMemo(
    () => ({
      chart: { ...CHART, type: "donut" },
      labels: clientsByRevenue.slice(0, 8).map((c) => c.nom_complete),
      colors: [
        "#4361ee",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#ec4899",
        "#64748b",
      ],
      legend: { position: "bottom", fontSize: "12px" },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${parseFloat(val).toFixed(1)}%`,
      },
      tooltip: {
        y: {
          formatter: (val) => formatCurrency(val),
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "60%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                formatter: () =>
                  formatCurrency(
                    clientsByRevenue.reduce((sum, c) => sum + c.revenue, 0),
                  ),
              },
            },
          },
        },
      },
    }),
    [clientsByRevenue],
  );

  const clientChartSeries = useMemo(
    () => clientsByRevenue.slice(0, 8).map((c) => c.revenue),
    [clientsByRevenue],
  );

  const topClientMLChartOptions = useMemo(
    () => ({
      chart: { ...CHART, type: "bar" },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 4, barHeight: "75%" },
      },
      colors: ["#10b981"],
      dataLabels: {
        enabled: true,
        formatter: (val) => `${parseFloat(val).toFixed(2)} ML`,
        style: { fontSize: "11px" },
      },
      xaxis: {
        title: { text: "Mètre Lin (ML)" },
        labels: { formatter: (v) => parseFloat(v).toFixed(1) },
      },
      tooltip: {
        y: { formatter: (val) => `${parseFloat(val).toFixed(2)} ML` },
      },
    }),
    [],
  );

  const topClientMLChartSeries = useMemo(
    () => [
      {
        name: "Mètre Lin",
        data: topClientsByMetreLin.map((c) => c.metreLineaire ?? 0),
      },
    ],
    [topClientsByMetreLin],
  );

  const topClientMLChartOptionsWithCategories = useMemo(
    () => ({
      ...topClientMLChartOptions,
      xaxis: {
        ...topClientMLChartOptions.xaxis,
        categories: topClientsByMetreLin.map((c) => c.nom_complete),
      },
    }),
    [topClientMLChartOptions, topClientsByMetreLin],
  );

  if (loading) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <p className="mt-3">
                  Chargement des informations du produit...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Produit non trouvé</h4>
                <p className="text-muted">
                  Le produit que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/produits")}
                >
                  Retour à la liste des produits
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = historyData?.produit?.statistics || produit?.statistics;
  const bonLivraisons = historyData?.documents?.byType?.bonLivraisons || [];
  const clients = salesByClient;
  const hasDateFilter = activeFilters.startDate || activeFilters.endDate;
  const activePeriodLabel = formatFilterPeriod(activeFilters);
  const isFilterDirty =
    draftFilters.startDate !== activeFilters.startDate ||
    draftFilters.endDate !== activeFilters.endDate;

  return (
    <div className="main-content">
      {/* Date Range Filter — controls ALL page data */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-primary border-2 shadow-sm">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h5 className="mb-1">
                    <FiCalendar className="me-2 text-primary" />
                    Filtre par période
                  </h5>
                  <small className="text-muted">
                    Contrôle toutes les statistiques, graphiques, clients et BL
                  </small>
                  <div className="mt-1">
                    <span className="badge bg-primary bg-opacity-10 text-white">
                      {activePeriodLabel}
                    </span>
                    {filterLoading && (
                      <span className="spinner-border spinner-border-sm ms-2 text-white" />
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <label className="small mb-0 fw-medium">Grouper par:</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: "120px" }}
                      value={groupBy}
                      onChange={(e) => handleGroupByChange(e.target.value)}
                      disabled={filterLoading}
                    >
                      <option value="week">Semaine</option>
                      <option value="month">Mois</option>
                    </select>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="small mb-0 fw-medium">Du:</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      style={{ width: "150px" }}
                      value={draftFilters.startDate}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="small mb-0 fw-medium">Au:</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      style={{ width: "150px" }}
                      value={draftFilters.endDate}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    className="btn btn-sm btn-primary text-white"
                    onClick={applyDateFilter}
                    disabled={filterLoading || !isFilterDirty}
                  >
                    {filterLoading ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <>
                        <FiSearch size={14} className="me-1" />
                        Appliquer
                      </>
                    )}
                  </button>
                  {hasDateFilter && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={resetFilters}
                      disabled={filterLoading}
                    >
                      <FiX size={14} /> Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Period Presets */}
              <div className="d-flex align-items-center flex-wrap gap-2 mt-3 pt-2 border-top border-light">
                <span className="small text-muted fw-medium me-2">
                  Périodes rapides :
                </span>
                {[
                  { key: "today", label: "Aujourd'hui" },
                  { key: "week", label: "Cette semaine" },
                  { key: "month", label: "Ce mois" },
                  { key: "year", label: "Cette année" },
                  { key: "all", label: "Toute la période" },
                ].map((preset) => {
                  const now = new Date();
                  const formatDateString = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    return `${year}-${month}-${day}`;
                  };
                  let expectedStart = "";
                  let expectedEnd = "";
                  if (preset.key === "today") {
                    expectedStart = formatDateString(now);
                    expectedEnd = formatDateString(now);
                  } else if (preset.key === "week") {
                    const currentDay = now.getDay();
                    const diff =
                      now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
                    const monday = new Date(now);
                    monday.setDate(diff);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    expectedStart = formatDateString(monday);
                    expectedEnd = formatDateString(sunday);
                  } else if (preset.key === "month") {
                    const firstDay = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1,
                    );
                    const lastDay = new Date(
                      now.getFullYear(),
                      now.getMonth() + 1,
                      0,
                    );
                    expectedStart = formatDateString(firstDay);
                    expectedEnd = formatDateString(lastDay);
                  } else if (preset.key === "year") {
                    const firstDay = new Date(now.getFullYear(), 0, 1);
                    const lastDay = new Date(now.getFullYear(), 11, 31);
                    expectedStart = formatDateString(firstDay);
                    expectedEnd = formatDateString(lastDay);
                  }

                  const isActive =
                    activeFilters.startDate === expectedStart &&
                    activeFilters.endDate === expectedEnd;

                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`btn btn-sm ${
                        isActive
                          ? "btn-primary shadow-sm"
                          : "btn-outline-primary"
                      }`}
                      style={{ fontSize: "0.8rem", borderRadius: "20px" }}
                      onClick={() => setPresetRange(preset.key)}
                      disabled={filterLoading}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiPackage className="me-2" />
                    {produit.designation}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: <strong>{produit.reference}</strong>
                  </p>
                </div>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => navigate("/produits")}
                >
                  <FiArrowLeft className="me-2" />
                  Retour
                </button>
              </div>

              <div className="row mt-3">
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiDollarSign className="me-2 text-muted" />
                    <span>
                      Prix Achat:{" "}
                      <strong>
                        {parseFloat(produit.prix_achat || 0).toFixed(2)} DH
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiDollarSign className="me-2 text-success" />
                    <span>
                      Prix Vente:{" "}
                      <strong className="text-success">
                        {parseFloat(produit.prix_vente || 0).toFixed(2)} DH
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center mb-2">
                    <FiBox className="me-2 text-muted" />
                    <span>
                      Surface:{" "}
                      <strong>
                        {produit.surface
                          ? parseFloat(produit.surface).toFixed(4)
                          : "-"}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  {produit.fornisseur && (
                    <div className="d-flex align-items-center mb-2">
                      <FiUsers className="me-2 text-muted" />
                      <span>
                        Fournisseur:{" "}
                        <strong
                          className="text-primary"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            navigate(`/fornisseurs/${produit.fornisseur.id}`)
                          }
                        >
                          {produit.fornisseur.nom_complete}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BL Stats Cards */}
      {stats && (
        <div
          className="row mb-4"
          style={{
            opacity: filterLoading ? 0.55 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Bons de Livraison</h6>
                    <h3 className="mb-0">{stats.uniqueBLCount || 0}</h3>
                    <small className="text-muted">
                      {stats.totalBLItems || 0} ligne(s) produit
                    </small>
                  </div>
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <FiTruck size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Mètre Lin Total</h6>
                    <h3 className="mb-0">
                      {(stats.totalMetreLineaire || 0).toFixed(2)} ML
                    </h3>
                    <small className="text-muted">{activePeriodLabel}</small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <FiTrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Chiffre d'Affaires</h6>
                    <h3 className="mb-0">
                      {formatCurrency(stats.totalRevenue || 0)}
                    </h3>
                    <small className="text-muted">{activePeriodLabel}</small>
                  </div>
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <FiDollarSign size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Clients</h6>
                    <h3 className="mb-0">{stats.uniqueClientsCount || 0}</h3>
                    <small className="text-muted">{activePeriodLabel}</small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <FiUsers size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div
        className="row mb-4"
        key={`charts-${filterKey}`}
        style={{
          opacity: filterLoading ? 0.55 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <div className="col-lg-8 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiBarChart2 className="me-2" />
                Évolution Mètre Lin — par {periodLabel}
              </h5>
            </div>
            <div className="card-body">
              {salesByPeriod.length > 0 ? (
                <ReactApexChart
                  options={periodChartOptions}
                  series={periodChartSeries}
                  type="line"
                  height={320}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  <FiBarChart2 size={40} className="mb-2" />
                  <p>Aucune vente BL sur cette période</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiUsers className="me-2" />
                Répartition par client
              </h5>
            </div>
            <div className="card-body">
              {clientsByRevenue.length > 0 ? (
                <ReactApexChart
                  options={clientChartOptions}
                  series={clientChartSeries}
                  type="donut"
                  height={320}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  <FiUsers size={40} className="mb-2" />
                  <p>Aucun client sur cette période</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {topClientsByMetreLin.length > 0 && (
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiTrendingUp className="me-2" />
                  Top clients — Mètre Lin ({activePeriodLabel})
                </h5>
              </div>
              <div className="card-body">
                <ReactApexChart
                  options={topClientMLChartOptionsWithCategories}
                  series={topClientMLChartSeries}
                  type="bar"
                  height={Math.max(280, topClientsByMetreLin.length * 45)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clients with BL stats */}
      {clients.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiUsers className="me-2" />
                  Clients — Ventes BL ({clients.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Téléphone</th>
                        <th>Ville</th>
                        <th className="text-center">BL</th>
                        <th className="text-end">Mètre Lin</th>
                        <th className="text-end">Quantité</th>
                        <th className="text-end">Montant</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client, index) => (
                        <tr key={client.id || index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiUser className="me-2 text-muted" />
                              <strong>{client.nom_complete}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiPhone className="me-1 text-muted" />
                              {client.telephone || "-"}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FiMapPin className="me-1 text-muted" />
                              {client.ville || "-"}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-info">
                              {client.blCount || 0}
                            </span>
                          </td>
                          <td className="text-end">
                            <strong className="text-primary">
                              {(client.metreLineaire || 0).toFixed(2)} ML
                            </strong>
                          </td>
                          <td className="text-end">
                            <strong>{parseQuantity(client.quantity)}</strong>
                          </td>
                          <td className="text-end text-success">
                            <strong>{formatCurrency(client.revenue)}</strong>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              title="Voir le client"
                            >
                              <FiEye size={14} className="me-1" />
                              Détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bon Livraison History */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <FiTruck className="me-2" />
                Historique Bons de Livraison ({bonLivraisons.length}) —{" "}
                {activePeriodLabel}
              </h5>
            </div>
            <div className="card-body">
              {bonLivraisons.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-sm">
                    <thead>
                      <tr>
                        <th>N° BL</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th className="text-center">Quantité</th>
                        <th>Dimensions</th>
                        <th className="text-end">Prix Unitaire</th>
                        <th className="text-end">Total Ligne</th>
                        <th>Statut</th>
                        <th>Facture</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonLivraisons.map((item, index) => (
                        <tr key={`bl-${index}`}>
                          <td>
                            <strong>{item.bonLivraison?.deliveryNumber}</strong>
                          </td>
                          <td>
                            <span className="d-flex align-items-center">
                              <FiCalendar className="me-1 text-muted" />
                              {formatDate(item.bonLivraison?.issueDate)}
                            </span>
                          </td>
                          <td>
                            {item.bonLivraison?.client ? (
                              <span
                                className="text-primary"
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                  navigate(
                                    `/clients/${item.bonLivraison.client.id}`,
                                  )
                                }
                              >
                                {item.bonLivraison.client.nom_complete}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-primary">
                              {parseQuantity(item.quantite)}
                            </span>
                          </td>
                          <td>
                            {item.v1 && item.v2
                              ? `${parseFloat(item.v1).toFixed(0)} x ${parseFloat(item.v2).toFixed(0)}`
                              : "-"}
                          </td>
                          <td className="text-end">
                            {formatCurrency(item.prix_unitaire)}
                          </td>
                          <td className="text-end">
                            <strong className="text-success">
                              {formatCurrency(item.total_ligne)}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`badge ${getStatusColor(item.bonLivraison?.status)}`}
                            >
                              {getStatusIcon(item.bonLivraison?.status)}
                              {getStatusText(item.bonLivraison?.status)}
                            </span>
                          </td>
                          <td>
                            {item.bonLivraison?.facture ? (
                              <span
                                className="badge bg-success text-white"
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                  navigate(
                                    `/factures/${item.bonLivraison.facture.id}`,
                                  )
                                }
                              >
                                {item.bonLivraison.facture.invoiceNumber}
                              </span>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                handleViewDocument(item.bonLivraison?.id)
                              }
                              title="Voir le BL"
                            >
                              <FiEye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <FiSearch size={48} className="text-muted mb-3" />
                  <h5>Aucun bon de livraison trouvé</h5>
                  <p className="text-muted">
                    Ce produit n'apparaît dans aucun BL pour la période
                    sélectionnée.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProduitDetails;
