import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config_url } from "@/utils/config";
import ClientPaymentStatusModal from "./ClientPaymentStatusModal";
import { Spinner } from "reactstrap";

import topTost from "@/utils/topTost";

// Icons
import {
  FiUser,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiPhone,
  FiMapPin,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPercent,
  FiCreditCard,
  FiPackage,
  FiFilter,
  FiX,
  FiBox,
  FiTrendingUp,
} from "react-icons/fi";

function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState("bon-livraison");
  const [filterStatus, setFilterStatus] = useState("all");

  // New state for product search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchData, setProductSearchData] = useState(null);
  const [allProductsStats, setAllProductsStats] = useState(null);
  const [searchParams, setSearchParams] = useState({
    reference: "",
    exactMatch: false,
    documentType: "bon-livraison",
    startDate: "",
    endDate: "",
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);

  // Fetch client data
  useEffect(() => {
    fetchClientData();
  }, [id]);

  // Fetch all products statistics for the client
  const fetchAllProductsStats = useCallback(
    async (useFilters = false) => {
      try {
        setProductSearchLoading(true);
        console.log(
          "Fetching products for client:",
          id,
          "useFilters:",
          useFilters,
        );

        // Build params for filtering (only if useFilters is true)
        const params = {};
        if (useFilters) {
          if (searchParams.startDate) {
            params.startDate = searchParams.startDate;
          }
          if (searchParams.endDate) {
            params.endDate = searchParams.endDate;
          }
          if (searchParams.documentType !== "all") {
            params.documentType = searchParams.documentType;
          }
        }

        console.log("Params:", params);

        const response = await axios.get(
          `${config_url}/api/clients/${id}/products`,
          {
            params: params,
            withCredentials: true,
          },
        );

        console.log("API Response:", response.data);
        setAllProductsStats(response.data);

        if (response.data.products && response.data.products.length > 0) {
          topTost(
            `${response.data.products.length} produit(s) trouvé(s)`,
            "success",
          );
        } else {
          topTost("Aucun produit trouvé", "info");
        }
      } catch (error) {
        console.error("Error fetching all products stats:", error);
        console.error("Error response:", error.response?.data);
        topTost("Erreur lors du chargement des statistiques", "error");
      } finally {
        setProductSearchLoading(false);
      }
    },
    [id, searchParams],
  );

  // Fetch all products stats when product search panel opens
  useEffect(() => {
    if (showProductSearch) {
      // Reset data when panel opens
      setAllProductsStats(null);
      setProductSearchData(null);
      // Fetch all products
      fetchAllProductsStats(false);
    }
  }, [showProductSearch, fetchAllProductsStats]);

  const fetchClientData = async () => {
    try {
      setLoading(true);

      // Fetch client details
      const clientRes = await axios.get(`${config_url}/api/clients/${id}`, {
        withCredentials: true,
      });
      setClient(clientRes.data.client);

      // Fetch client summary
      const summaryRes = await axios.get(
        `${config_url}/api/clients/${id}/summary`,
        { withCredentials: true },
      );
      setSummary(summaryRes.data.summary);

      // Fetch client history
      const historyRes = await axios.get(
        `${config_url}/api/clients/${id}/history`,
        { withCredentials: true },
      );
      setHistory(historyRes.data.documents.all || []);
    } catch (error) {
      console.error("Error fetching client data:", error);
      topTost(
        error.response?.data?.message || "Error loading client data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async () => {
    // Allow search without reference if date filters are applied
    if (
      !searchParams.reference.trim() &&
      !searchParams.startDate &&
      !searchParams.endDate &&
      searchParams.documentType === "all"
    ) {
      topTost(
        "Veuillez saisir une référence produit ou appliquer des filtres",
        "warning",
      );
      return;
    }

    try {
      setProductSearchLoading(true);

      // Build params
      const params = {};

      if (searchParams.reference.trim()) {
        params.reference = searchParams.reference.trim();
      }

      // Only add documentType if it's NOT "all"
      if (searchParams.documentType !== "all") {
        params.documentType = searchParams.documentType;
      }

      // Add date range filters if provided
      if (searchParams.startDate) {
        params.startDate = searchParams.startDate;
      }
      if (searchParams.endDate) {
        params.endDate = searchParams.endDate;
      }

      let response;
      if (searchParams.reference.trim()) {
        // Search by reference
        response = await axios.get(
          `${config_url}/api/clients/${id}/products-by-reference`,
          {
            params: params,
            withCredentials: true,
          },
        );
        setProductSearchData(response.data);
        if (response.data.history && response.data.history.length > 0) {
          topTost(
            `Trouvé ${response.data.history.length} entrée(s)`,
            "success",
          );
        } else {
          topTost("Aucun produit trouvé", "info");
        }
      } else {
        // Search all products with date filter
        response = await axios.get(`${config_url}/api/clients/${id}/products`, {
          params: params,
          withCredentials: true,
        });
        setAllProductsStats(response.data);
        if (response.data.products && response.data.products.length > 0) {
          topTost(
            `Trouvé ${response.data.products.length} produit(s)`,
            "success",
          );
        } else {
          topTost("Aucun produit trouvé", "info");
        }
      }

      // Add to search history
      if (searchParams.reference.trim()) {
        setSearchHistory((prev) => [
          {
            reference: searchParams.reference.trim(),
            exactMatch: searchParams.exactMatch,
            documentType: searchParams.documentType,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
            timestamp: new Date().toISOString(),
            resultCount:
              response.data.summary?.totalEntries ||
              response.data.statistics?.totalProducts ||
              0,
          },
          ...prev.slice(0, 4),
        ]);
      }

      setShowProductSearch(true);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erreur lors de la recherche";
      topTost(errorMessage, "error");
      setProductSearchData(null);
    } finally {
      setProductSearchLoading(false);
    }
  };

  // Clear product search
  const clearProductSearch = () => {
    setProductSearchData(null);
    setAllProductsStats(null);
    setShowProductSearch(false);
    setSearchParams({
      reference: "",
      exactMatch: false,
      documentType: "bon-livraison",
      startDate: "",
      endDate: "",
    });
  };

  // Load previous search
  const loadPreviousSearch = (search) => {
    setSearchParams({
      reference: search.reference,
      exactMatch: search.exactMatch,
      documentType: search.documentType,
    });
    // Trigger search automatically when loading previous search
    setTimeout(() => handleProductSearch(), 100);
  };

  // Filter history based on selected filters
  const filteredHistory = history.filter((doc) => {
    if (filterType !== "all" && doc.document_type !== filterType) return false;
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;
    return true;
  });

  // Get status badge color
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

  // Get document type icon
  const getDocumentIcon = (type) => {
    switch (type) {
      case "devis":
        return <FiFileText className="me-2" />;
      case "bon-livraison":
        return <FiTruck className="me-2" />;
      case "facture":
        return <FiDollarSign className="me-2" />;
      default:
        return <FiFileText className="me-2" />;
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date without time
  const formatDateShort = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Handle document view
  const handleViewDocument = (doc) => {
    if (!doc?.id) return;
    let route = "";
    switch (doc.document_type) {
      case "devis":
        route = `/devis/${doc.id}`;
        break;
      case "bon-livraison":
        route = `/bon-livraisons/${doc.id}`;
        break;
      case "facture":
        route = `/factures/${doc.id}`;
        break;
    }
    if (route) navigate(route);
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

  // Safe quantity parsing (handles both string and number)
  const parseQuantity = (qty) => {
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") return parseFloat(qty) || 0;
    return 0;
  };

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
                <p className="mt-3">Chargement des informations client...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Client non trouvé</h4>
                <p className="text-muted">
                  Le client que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/clients")}
                >
                  Retour à la liste des clients
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Client Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiUser className="me-2" />
                    {client.nom_complete}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: {client.reference || "Non spécifiée"}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowProductSearch(!showProductSearch)}
                  >
                    <FiSearch className="me-2" />
                    Recherche par Référence Produit
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => setShowPaymentStatusModal(true)}
                  >
                    <FiCreditCard className="me-2" />
                    Statut de Paiement
                  </button>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiPhone className="me-2 text-muted" />
                    <span>{client.telephone}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FiMapPin className="me-2 text-muted" />
                    <span>{client.ville}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Search Panel */}
      {showProductSearch && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiSearch className="me-2" />
                  Recherche par Référence Produit
                </h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={clearProductSearch}
                >
                  <FiX size={16} />
                </button>
              </div>
              <div className="card-body">
                {/* Search Form */}
                <div className="row mb-4">
                  <div className="col-md-8">
                    <div className="input-group">
                      <span className="input-group-text">
                        <FiBox />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Entrez la référence du produit (ex: ESQ40)"
                        value={searchParams.reference}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            reference: e.target.value,
                          })
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleProductSearch();
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleProductSearch}
                        disabled={productSearchLoading}
                      >
                        {productSearchLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Recherche...
                          </>
                        ) : (
                          <>
                            <FiSearch className="me-2" />
                            Rechercher
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex gap-3">
                      <select
                        className="form-select form-select-sm w-auto"
                        value={searchParams.documentType}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            documentType: e.target.value,
                          })
                        }
                      >
                        <option value="all">Tous les documents</option>
                        <option value="devis">Devis seulement</option>
                        <option value="bon-livraison">BL seulement</option>
                        <option value="facture">Factures seulement</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <span className="text-muted small">
                        Filtrer par date:
                      </span>
                      <div className="d-flex align-items-center gap-2">
                        <label className="small mb-0">Du:</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          style={{ width: "150px" }}
                          value={searchParams.startDate}
                          onChange={(e) =>
                            setSearchParams({
                              ...searchParams,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <label className="small mb-0">Au:</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          style={{ width: "150px" }}
                          value={searchParams.endDate}
                          onChange={(e) =>
                            setSearchParams({
                              ...searchParams,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setProductSearchData(null);
                          fetchAllProductsStats(true); // Use filters
                        }}
                        disabled={productSearchLoading}
                      >
                        {productSearchLoading ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <FiSearch size={14} className="me-1" />
                            Appliquer
                          </>
                        )}
                      </button>
                      {(searchParams.startDate ||
                        searchParams.endDate ||
                        searchParams.documentType !== "all") && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setSearchParams({
                              ...searchParams,
                              startDate: "",
                              endDate: "",
                              documentType: "bon-livraison",
                            });
                            setProductSearchData(null);
                            fetchAllProductsStats(false); // Fetch all without filters
                          }}
                        >
                          <FiX size={14} /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {productSearchData ? (
                  <>
                    {/* Statistics Cards */}
                    <div className="row mb-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-primary">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Total Entrées
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary?.totalEntries || 0}
                                </h3>
                              </div>
                              <div className="bg-primary bg-opacity-10 p-3 rounded">
                                <FiPackage size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-info">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Produits Uniques
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary
                                    ?.totalUniqueProducts || 0}
                                </h3>
                              </div>
                              <div className="bg-info bg-opacity-10 p-3 rounded">
                                <FiBox size={24} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-warning">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Quantité Totale
                                </h6>
                                <h3 className="mb-0">
                                  {productSearchData.summary?.totalQuantity ||
                                    0}
                                </h3>
                              </div>
                              <div className="bg-warning bg-opacity-10 p-3 rounded">
                                <FiTrendingUp
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <div className="card border-success">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="text-muted mb-1">
                                  Montant Total
                                </h6>
                                <h3 className="mb-0">
                                  {formatCurrency(
                                    productSearchData.summary?.totalAmount || 0,
                                  )}
                                </h3>
                              </div>
                              <div className="bg-success bg-opacity-10 p-3 rounded">
                                <FiDollarSign
                                  size={24}
                                  className="text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Statistics */}
                    {productSearchData.productStatistics &&
                      productSearchData.productStatistics.length > 0 && (
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header">
                                <h6 className="card-title mb-0">
                                  <FiPackage className="me-2" />
                                  Statistiques par Produit
                                </h6>
                              </div>
                              <div className="card-body">
                                {productSearchData.productStatistics.map(
                                  (stat, index) => (
                                    <div
                                      key={index}
                                      className="mb-4 p-3 border rounded"
                                    >
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                          <h5 className="mb-1">
                                            {stat.product?.designation}
                                          </h5>
                                          <p className="text-muted mb-0">
                                            Référence:{" "}
                                            <strong>
                                              {stat.product?.reference}
                                            </strong>{" "}
                                            | Prix:{" "}
                                            <strong>
                                              {formatCurrency(
                                                stat.product?.prix_vente,
                                              )}
                                            </strong>
                                          </p>
                                        </div>
                                        <div className="text-end">
                                          <span className="badge bg-primary">
                                            {stat.appearances || 0}{" "}
                                            apparition(s)
                                          </span>
                                        </div>
                                      </div>

                                      <div className="row">
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Quantité Totale</h6>
                                            <h4 className="text-primary">
                                              {stat.totalQuantity || 0}
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Montant Total</h6>
                                            <h4 className="text-success">
                                              {formatCurrency(stat.totalAmount)}
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-3">
                                            <h6>Période</h6>
                                            <p className="mb-1">
                                              <small>
                                                Première:{" "}
                                                {formatDateShort(
                                                  stat.firstSeen,
                                                )}
                                              </small>
                                            </p>
                                            <p className="mb-0">
                                              <small>
                                                Dernière:{" "}
                                                {formatDateShort(stat.lastSeen)}
                                              </small>
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Document Type Breakdown */}
                                      <div className="mt-3">
                                        <h6>
                                          Répartition par Type de Document:
                                        </h6>
                                        <div className="d-flex gap-3">
                                          <div className="text-center">
                                            <div className="bg-primary bg-opacity-10 p-2 rounded">
                                              <FiFileText
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              Devis
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.devis
                                                ?.count || 0}
                                            </strong>
                                          </div>
                                          <div className="text-center">
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                              <FiTruck
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              BL
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.[
                                                "bon-livraison"
                                              ]?.count || 0}
                                            </strong>
                                          </div>
                                          <div className="text-center">
                                            <div className="bg-success bg-opacity-10 p-2 rounded">
                                              <FiDollarSign
                                                className="text-white"
                                                size={20}
                                              />
                                            </div>
                                            <small className="d-block mt-1">
                                              Factures
                                            </small>
                                            <strong>
                                              {stat.byDocumentType?.facture
                                                ?.count || 0}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* History Table */}
                    {productSearchData.history &&
                    productSearchData.history.length > 0 ? (
                      <div className="row">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-header">
                              <h6 className="card-title mb-0">
                                <FiCalendar className="me-2" />
                                Historique des Transactions (
                                {productSearchData.history.length} entrée(s))
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead>
                                    <tr>
                                      <th>Type</th>
                                      <th>Numéro</th>
                                      <th>Date</th>
                                      <th>Produit</th>
                                      <th>Quantité</th>
                                      <th>Prix Unitaire</th>
                                      <th>Total Ligne</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productSearchData.history.map(
                                      (item, index) => (
                                        <tr key={index}>
                                          <td>
                                            <span className="d-flex align-items-center">
                                              {getDocumentIcon(
                                                item.document_type,
                                              )}
                                              <span className="text-capitalize">
                                                {item.document_type?.replace(
                                                  "-",
                                                  " ",
                                                )}
                                              </span>
                                            </span>
                                          </td>
                                          <td>
                                            <strong>
                                              {item.document?.num}
                                            </strong>
                                            <div className="small text-muted">
                                              {item.document?.status}
                                            </div>
                                          </td>
                                          <td>
                                            <span className="d-flex align-items-center">
                                              <FiCalendar className="me-1 text-muted" />
                                              {formatDate(item.issueDate)}
                                            </span>
                                          </td>
                                          <td>
                                            <div>
                                              <strong>
                                                {item.produit?.designation}
                                              </strong>
                                              <div className="small text-muted">
                                                Ref: {item.produit?.reference}
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <span className="badge bg-primary">
                                              {parseQuantity(item.quantite)}
                                            </span>
                                          </td>
                                          <td>
                                            <strong>
                                              {formatCurrency(
                                                item.prix_unitaire,
                                              )}
                                            </strong>
                                          </td>
                                          <td>
                                            <strong className="text-success">
                                              {formatCurrency(item.total_ligne)}
                                            </strong>
                                          </td>
                                          <td>
                                            <button
                                              className="btn btn-sm btn-outline-primary"
                                              onClick={() =>
                                                handleViewDocument({
                                                  id: item.document?.id,
                                                  document_type:
                                                    item.document_type,
                                                })
                                              }
                                              title="Voir le document"
                                            >
                                              <FiEye size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Empty state when no history found
                      <div className="row">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-body text-center py-5">
                              <FiPackage
                                size={48}
                                className="text-muted mb-3"
                              />
                              <h5>Aucun historique trouvé</h5>
                              <p className="text-muted">
                                Aucune transaction trouvée pour la référence "
                                {searchParams.reference}" avec les critères
                                sélectionnés.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Initial search state - show all products when loaded */
                  <>
                    {productSearchLoading ||
                    (!allProductsStats && !productSearchData) ? (
                      <div className="text-center py-5">
                        <div
                          className="spinner-border text-primary"
                          role="status"
                        >
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                        <p className="mt-3">Chargement des produits...</p>
                      </div>
                    ) : allProductsStats && allProductsStats.products ? (
                      <>
                        {/* Statistics Cards for All Products */}
                        <div className="row mb-4">
                          <div className="col-xl-3 col-md-6 mb-3">
                            <div className="card border-primary">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="text-muted mb-1">
                                      Total Produits
                                    </h6>
                                    <h3 className="mb-0">
                                      {allProductsStats.statistics
                                        ?.totalProducts || 0}
                                    </h3>
                                  </div>
                                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                                    <FiPackage
                                      size={24}
                                      className="text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <div className="card border-info">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="text-muted mb-1">
                                      Quantité Totale
                                    </h6>
                                    <h3 className="mb-0">
                                      {allProductsStats.statistics
                                        ?.totalQuantity || 0}
                                    </h3>
                                  </div>
                                  <div className="bg-info bg-opacity-10 p-3 rounded">
                                    <FiTrendingUp
                                      size={24}
                                      className="text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <div className="card border-warning">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="text-muted mb-1">
                                      Montant Total
                                    </h6>
                                    <h3 className="mb-0">
                                      {formatCurrency(
                                        allProductsStats.statistics
                                          ?.totalAmount || 0,
                                      )}
                                    </h3>
                                  </div>
                                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    <FiDollarSign
                                      size={24}
                                      className="text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <div className="card border-success">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="text-muted mb-1">
                                      Moyenne/Produit
                                    </h6>
                                    <h3 className="mb-0">
                                      {formatCurrency(
                                        allProductsStats.statistics
                                          ?.averagePerProduct || 0,
                                      )}
                                    </h3>
                                  </div>
                                  <div className="bg-success bg-opacity-10 p-3 rounded">
                                    <FiTrendingUp
                                      size={24}
                                      className="text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* All Products List */}
                        {allProductsStats.products.length > 0 ? (
                          <div className="row">
                            <div className="col-12">
                              <div className="card">
                                <div className="card-header">
                                  <h6 className="card-title mb-0">
                                    <FiPackage className="me-2" />
                                    Tous les Produits (
                                    {allProductsStats.products.length})
                                  </h6>
                                </div>
                                <div className="card-body">
                                  <div className="table-responsive">
                                    <table className="table table-hover">
                                      <thead>
                                        <tr>
                                          <th>Produit</th>
                                          <th>Référence</th>
                                          <th className="text-center">
                                            Quantité Totale
                                          </th>
                                          <th className="text-end">
                                            Montant Total
                                          </th>
                                          <th className="text-center">
                                            Première Achat
                                          </th>
                                          <th className="text-center">
                                            Dernière Achat
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allProductsStats.products.map(
                                          (product, index) => (
                                            <tr key={index}>
                                              <td>
                                                <strong>
                                                  {product.product?.designation}
                                                </strong>
                                              </td>
                                              <td>
                                                <span className="text-muted">
                                                  {product.product?.reference}
                                                </span>
                                              </td>
                                              <td className="text-center">
                                                <span className="badge bg-primary">
                                                  {product.totalQuantity}
                                                </span>
                                              </td>
                                              <td className="text-end">
                                                <strong className="text-success">
                                                  {formatCurrency(
                                                    product.totalAmount,
                                                  )}
                                                </strong>
                                              </td>
                                              <td className="text-center">
                                                <small className="text-muted">
                                                  {formatDateShort(
                                                    product.firstPurchase,
                                                  )}
                                                </small>
                                              </td>
                                              <td className="text-center">
                                                <small className="text-muted">
                                                  {formatDateShort(
                                                    product.lastPurchase,
                                                  )}
                                                </small>
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-5">
                            <FiBox size={48} className="text-muted mb-3" />
                            <h5>Aucun produit trouvé</h5>
                            <p className="text-muted mb-4">
                              Ce client n'a pas de produits pour cette période.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-5">
                        <FiBox size={48} className="text-muted mb-3" />
                        <h5>Aucun produit trouvé</h5>
                        <p className="text-muted mb-4">
                          Utilisez les filtres ci-dessus ou entrez une référence
                          pour rechercher.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Only show when NOT in product search mode */}
      {summary && !showProductSearch && (
        <div className="row mb-4 fs-3">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Total Devis</h6>
                    <h3 className="mb-0">{summary?.counts?.devis || 0}</h3>
                    <small className="text-muted">
                      {formatCurrency(summary?.financial?.totalSales || 0)}
                    </small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <FiFileText size={24} className="text-white" />
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
                    <h6 className="text-muted mb-1">Total BL</h6>
                    <h3 className="mb-0">
                      {summary?.counts?.bonLivraisons || 0}
                    </h3>
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
                    <h6 className="text-muted mb-1">Total Factures</h6>
                    <h3 className="mb-0">{summary?.counts?.factures || 0}</h3>
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
                    <h6 className="text-muted mb-1">En Attente</h6>
                    <h3 className="mb-0">
                      {formatCurrency(
                        summary?.financial?.totalOutstanding || 0,
                      )}
                    </h3>
                    <small className="text-muted">
                      {summary?.financial?.paymentPercentage?.toFixed(1) || 0}%
                      payé
                    </small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <FiCreditCard size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Latest Documents - Only show when NOT in product search mode */}
      {summary && summary?.latestDocuments && !showProductSearch && (
        <div className="row mb-4 fs-5">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  Documents Récents (الوثائق الحديثة)
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* Latest Devis */}
                  <div className="col-md-4 mb-3">
                    <div className="card border">
                      <div className="card-body">
                        <h6 className="card-title d-flex align-items-center">
                          <FiFileText className="me-2 text-white" />
                          Dernier Devis
                        </h6>
                        {summary.latestDocuments.devis ? (
                          <>
                            <p className="mb-1">
                              <strong>
                                {summary.latestDocuments.devis.devisNumber}
                              </strong>
                            </p>
                            <p className="mb-1 text-muted small">
                              <FiCalendar className="me-1" />
                              {formatDate(
                                summary.latestDocuments.devis.issueDate,
                              )}
                            </p>
                            <p className="mb-2">
                              {formatCurrency(
                                summary.latestDocuments.devis.total,
                              )}
                            </p>
                            <span
                              className={`badge bg-${getStatusColor(summary.latestDocuments.devis.status)}`}
                            >
                              {getStatusIcon(
                                summary.latestDocuments.devis.status,
                              )}
                              {getStatusText(
                                summary.latestDocuments.devis.status,
                              )}
                            </span>
                          </>
                        ) : (
                          <p className="text-muted mb-0">Aucun devis</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Latest Bon Livraison */}
                  <div className="col-md-4 mb-3">
                    <div className="card border">
                      <div className="card-body">
                        <h6 className="card-title d-flex align-items-center">
                          <FiTruck className="me-2 text-info" />
                          Dernier BL
                        </h6>
                        {summary.latestDocuments.bonLivraison ? (
                          <>
                            <p className="mb-1">
                              <strong>
                                {
                                  summary.latestDocuments.bonLivraison
                                    .deliveryNumber
                                }
                              </strong>
                            </p>
                            <p className="mb-1 text-muted small">
                              <FiCalendar className="me-1" />
                              {formatDate(
                                summary.latestDocuments.bonLivraison.issueDate,
                              )}
                            </p>
                            <p className="mb-2">
                              {formatCurrency(
                                summary.latestDocuments.bonLivraison.total,
                              )}
                            </p>
                            <span
                              className={`badge bg-${getStatusColor(summary.latestDocuments.bonLivraison.status)}`}
                            >
                              {getStatusIcon(
                                summary.latestDocuments.bonLivraison.status,
                              )}
                              {summary.latestDocuments.bonLivraison.status}
                            </span>
                          </>
                        ) : (
                          <p className="text-muted mb-0">
                            Aucun bon de livraison
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Latest Facture */}
                  <div className="col-md-4 mb-3">
                    <div className="card border">
                      <div className="card-body">
                        <h6 className="card-title d-flex align-items-center">
                          <FiDollarSign className="me-2 text-success" />
                          Dernière Facture
                        </h6>
                        {summary.latestDocuments.facture ? (
                          <>
                            <p className="mb-1">
                              <strong>
                                {summary.latestDocuments.facture.invoiceNumber}
                              </strong>
                            </p>
                            <p className="mb-1 text-muted small">
                              <FiCalendar className="me-1" />
                              {formatDate(
                                summary.latestDocuments.facture.issueDate,
                              )}
                            </p>
                            <p className="mb-2">
                              {formatCurrency(
                                summary.latestDocuments.facture.totalTTC,
                              )}
                            </p>
                            <span
                              className={`badge bg-${getStatusColor(summary.latestDocuments.facture.status)}`}
                            >
                              {getStatusIcon(
                                summary.latestDocuments.facture.status,
                              )}
                              {summary.latestDocuments.facture.status}
                            </span>
                          </>
                        ) : (
                          <p className="text-muted mb-0">Aucune facture</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Table - Only show when NOT in product search mode */}
      {!showProductSearch && (
        <div className="row">
          <div className="col-12 fs-5">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  Historique des Documents (سجل الوثائق)
                </h5>
                <div className="d-flex gap-2">
                  {/* Filters */}
                  <select
                    className="form-select form-select-sm w-auto"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="bon-livraison">Bon de Livraison</option>
                    <option value="all">Tous les types</option>
                    <option value="devis">Devis</option>
                    <option value="facture">Facture</option>
                  </select>

                  <select
                    className="form-select form-select-sm w-auto"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="brouillon">Non Payé</option>
                    <option value="payée">Payée</option>
                    <option value="payé">Payé</option>
                    <option value="partiellement_payée">
                      Partiellement payée
                    </option>
                    <option value="envoyée">Envoyée</option>
                    <option value="annulée">Annulée</option>
                    <option value="accepté">Accepté</option>
                    <option value="refusé">Refusé</option>
                  </select>
                </div>
              </div>
              <div className="card-body">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-5">
                    <FiSearch size={48} className="text-muted mb-3" />
                    <h5>Aucun document trouvé</h5>
                    <p className="text-muted">
                      Aucun document ne correspond aux filtres sélectionnés
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Numéro</th>
                          <th>Date</th>
                          <th>Montant TTC</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((doc, index) => (
                          <tr key={index}>
                            <td>
                              <span className="d-flex align-items-center">
                                {getDocumentIcon(doc.document_type)}
                                {doc.document_type === "devis"
                                  ? "Devis"
                                  : doc.document_type === "bon-livraison"
                                    ? "Bon Livraison"
                                    : "Facture"}
                              </span>
                            </td>
                            <td>
                              <strong>
                                {doc.devisNumber ||
                                  doc.deliveryNumber ||
                                  doc.invoiceNumber}
                              </strong>
                            </td>
                            <td>
                              <span className="d-flex align-items-center">
                                <FiCalendar className="me-1 text-muted" />
                                {formatDate(doc.issueDate)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold">
                                {formatCurrency(
                                  doc.montant_ttc ||
                                    doc.total ||
                                    doc.totalTTC ||
                                    0,
                                )}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge fs-5 ${getStatusColor(doc.status)}`}
                              >
                                {getStatusIcon(doc.status)}
                                {getStatusText(doc.status)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleViewDocument(doc)}
                                  title="Voir"
                                >
                                  <FiEye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentStatusModal && (
        <ClientPaymentStatusModal
          clientId={id}
          clientName={client.nom_complete}
          onClose={() => setShowPaymentStatusModal(false)}
        />
      )}
    </div>
  );
}

export default ClientDetails;
