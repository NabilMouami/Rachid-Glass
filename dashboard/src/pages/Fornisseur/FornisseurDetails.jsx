import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";

// Icons
import {
  FiUser,
  FiFileText,
  FiShoppingBag,
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
  FiTruck,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";

function FornisseurDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fornisseur, setFornisseur] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // State for product search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchData, setProductSearchData] = useState(null);
  const [allProductsStats, setAllProductsStats] = useState(null);
  const [searchParams, setSearchParams] = useState({
    reference: "",
    exactMatch: false,
    documentType: "all",
    startDate: "",
    endDate: "",
  });
  const [searchHistory, setSearchHistory] = useState([]);

  // Fetch fornisseur data
  useEffect(() => {
    fetchFornisseurData();
  }, [id]);

  // Fetch all products statistics for the fornisseur
  const fetchAllProductsStats = useCallback(async (useFilters = false) => {
    try {
      setProductSearchLoading(true);

      // Build params for filtering (only if useFilters is true)
      const params = {};
      if (useFilters) {
        if (searchParams.startDate) params.startDate = searchParams.startDate;
        if (searchParams.endDate) params.endDate = searchParams.endDate;
      }

      const response = await axios.get(
        `${config_url}/api/fornisseurs/${id}/products`,
        { params, withCredentials: true }
      );

      setAllProductsStats(response.data);

      if (response.data.products && response.data.products.length > 0) {
        topTost(`${response.data.products.length} produit(s) trouvé(s)`, "success");
      } else {
        topTost("Aucun produit trouvé", "info");
      }
    } catch (error) {
      console.error("Error fetching all products stats:", error);
      topTost("Erreur lors du chargement des statistiques", "error");
    } finally {
      setProductSearchLoading(false);
    }
  }, [id, searchParams]);

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

  const fetchFornisseurData = async () => {
    try {
      setLoading(true);

      // Fetch fornisseur details
      const fornisseurRes = await axios.get(
        `${config_url}/api/fornisseurs/${id}`,
        { withCredentials: true },
      );
      setFornisseur(fornisseurRes.data.fornisseur);

      // Fetch recent FacturesAchat
      const recentRes = await axios.get(
        `${config_url}/api/fornisseurs/${id}/factures-achat/recent`,
        { withCredentials: true },
      );
      setHistory(recentRes.data.recentFacturesAchat || []);
    } catch (error) {
      console.error("Error fetching fornisseur data:", error);
      topTost(
        error.response?.data?.message || "Error loading fornisseur data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async () => {
    // Allow search without reference if date filters are applied
    if (!searchParams.reference.trim() && !searchParams.startDate && !searchParams.endDate) {
      topTost("Veuillez saisir une référence produit ou appliquer des filtres de date", "warning");
      return;
    }

    try {
      setProductSearchLoading(true);

      const params = {};

      if (searchParams.reference.trim()) {
        params.reference = searchParams.reference.trim();
      }
      if (searchParams.startDate) params.startDate = searchParams.startDate;
      if (searchParams.endDate) params.endDate = searchParams.endDate;

      let response;
      if (searchParams.reference.trim()) {
        // Search by reference
        response = await axios.get(
          `${config_url}/api/fornisseurs/${id}/product-history`,
          { params, withCredentials: true },
        );

        setProductSearchData(response.data);
        if (response.data.history && response.data.history.length > 0) {
          topTost(
            `Trouvé ${response.data.history.length} entrée(s) pour "${searchParams.reference}"`,
            "success",
          );
        } else {
          topTost("Aucun produit trouvé pour cette référence", "info");
        }
      } else {
        // Search all products with date filter
        response = await axios.get(
          `${config_url}/api/fornisseurs/${id}/products`,
          { params, withCredentials: true },
        );
        setAllProductsStats(response.data);
        if (response.data.products && response.data.products.length > 0) {
          topTost(`Trouvé ${response.data.products.length} produit(s)`, "success");
        } else {
          topTost("Aucun produit trouvé", "info");
        }
      }

      // Add to search history
      if (searchParams.reference.trim()) {
        setSearchHistory((prev) => [
          {
            reference: searchParams.reference.trim(),
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
            timestamp: new Date().toISOString(),
            resultCount: response.data.summary?.totalEntries || 0,
          },
          ...prev.slice(0, 4),
        ]);
      }

      setShowProductSearch(true);
    } catch (error) {
      console.error("Error:", error);
      topTost(
        error.response?.data?.message || error.message || "Erreur lors de la recherche",
        "error",
      );
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
      documentType: "all",
      startDate: "",
      endDate: "",
    });
  };

  // Load previous search
  const loadPreviousSearch = (search) => {
    setSearchParams({
      reference: search.reference,
      exactMatch: search.exactMatch,
      startDate: search.startDate || "",
      endDate: search.endDate || "",
      documentType: "all",
    });
    // Trigger search automatically when loading previous search
    setTimeout(() => handleProductSearch(), 100);
  };

  // Filter history based on selected filters
  const filteredHistory = history.filter((doc) => {
    if (filterStatus !== "all" && doc.status !== filterStatus) return false;
    return true;
  });

  // Get status badge color for BonAchat
  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-danger text-white",
      commandé: "bg-info text-white",
      partiellement_reçu: "bg-warning text-dark",
      reçu: "bg-success text-white",
      partiellement_payée: "bg-orange text-white",
      payé: "bg-success text-white",
      annulé: "bg-danger text-white",
    };
    return colors[status] || "bg-light text-dark";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Non Paye",
      commandé: "Commandé",
      partiellement_reçu: "Partiellement Reçu",
      reçu: "Reçu",
      partiellement_payée: "Partiellement Payé",
      payé: "Payé",
      annulé: "Annulé",
    };
    return texts[status] || status;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "payé":
      case "reçu":
        return <FiCheckCircle className="me-1" />;
      case "brouillon":
        return <FiClock className="me-1" />;
      case "partiellement_payée":
      case "partiellement_reçu":
        return <FiPercent className="me-1" />;
      case "annulé":
        return <FiXCircle className="me-1" />;
      case "commandé":
        return <FiShoppingBag className="me-1" />;
      default:
        return <FiClock className="me-1" />;
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "espèces":
        return <FiDollarSign className="me-1" />;
      case "carte_bancaire":
        return <FiCreditCard className="me-1" />;
      case "chèque":
        return <FiFileText className="me-1" />;
      case "virement":
        return <FiTrendingUp className="me-1" />;
      case "crédit":
        return <FiPercent className="me-1" />;
      default:
        return <FiDollarSign className="me-1" />;
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

  // Handle BonAchat view
  const handleViewBonAchat = (bonAchatId) => {
    navigate(`/facture-achat/${bonAchatId}`);
  };

  // Safe quantity parsing
  const parseQuantity = (qty) => {
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") return parseFloat(qty) || 0;
    return 0;
  };

  // Calculate summary if not available from API
  const calculateSummary = () => {
    if (!history.length) return null;

    const stats = {
      totalFacturesAchat: history.length,
      totalAmountTTC: history.reduce(
        (sum, fa) => sum + parseFloat(fa.totalTTC || 0),
        0,
      ),
      totalAmountHT: history.reduce(
        (sum, fa) => sum + parseFloat(fa.totalHT || 0),
        0,
      ),
      statusCounts: {},
    };

    history.forEach((fa) => {
      stats.statusCounts[fa.status] = (stats.statusCounts[fa.status] || 0) + 1;
    });

    return stats;
  };

  const summaryStats = summary || calculateSummary();

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
                  Chargement des informations fournisseur...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!fornisseur) {
    return (
      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <h4>Fournisseur non trouvé</h4>
                <p className="text-muted">
                  Le fournisseur que vous recherchez n'existe pas.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/fornisseurs")}
                >
                  Retour à la liste des fournisseurs
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
      {/* Fornisseur Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="card-title mb-1">
                    <FiUser className="me-2" />
                    {fornisseur.nom_complete}
                  </h4>
                  <p className="text-muted mb-0">
                    Référence: {fornisseur.reference || "Non spécifiée"}
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
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiPhone className="me-2 text-muted" />
                    <span>{fornisseur.telephone}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FiMapPin className="me-2 text-muted" />
                    <span>{fornisseur.ville || "Ville non spécifiée"}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <FiBox className="me-2 text-muted" />
                    <span>{fornisseur.address || "Adresse non spécifiée"}</span>
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
                </div>

                {/* Date Range Filter */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <span className="text-muted small">Filtrer par date:</span>
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
                      {(searchParams.startDate || searchParams.endDate) && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setSearchParams({
                              ...searchParams,
                              startDate: "",
                              endDate: "",
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

                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div className="mb-4">
                    <h6 className="mb-2">Recherches récentes:</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {searchHistory.map((search, index) => (
                        <button
                          key={index}
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => loadPreviousSearch(search)}
                          title={`${search.reference} - ${search.resultCount} résultats`}
                        >
                          {search.reference} ({search.resultCount})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                                  {productSearchData.summary?.totalAmount || 0}{" "}
                                  Dh
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
                                            | Prix d'achat:{" "}
                                            <strong>
                                              {stat.product?.prix_achat} Dh
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
                                        <div className="col-md-3">
                                          <div className="mb-3">
                                            <h6>Quantité Totale</h6>
                                            <h4 className="text-primary">
                                              {stat.totalQuantity || 0}
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
                                          <div className="mb-3">
                                            <h6>Montant Total</h6>
                                            <h4 className="text-success">
                                              {stat.totalAmount} Dh
                                            </h4>
                                          </div>
                                        </div>
                                        <div className="col-md-3">
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

                                      {/* Price Statistics */}
                                      <div className="row mt-3">
                                        <div className="col-md-4">
                                          <div className="mb-2">
                                            <small>Prix Moyen</small>
                                            <h6 className="text-info">
                                              {stat.averageUnitPrice} Dh
                                            </h6>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-2">
                                            <small>Prix Minimum</small>
                                            <h6 className="text-success">
                                              {stat.minUnitPrice} Dh
                                            </h6>
                                          </div>
                                        </div>
                                        <div className="col-md-4">
                                          <div className="mb-2">
                                            <small>Prix Maximum</small>
                                            <h6 className="text-danger">
                                              {stat.maxUnitPrice} Dh
                                            </h6>
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

                    {/* BonAchat Details */}
                    {productSearchData.bonAchatDetails &&
                      productSearchData.bonAchatDetails.length > 0 && (
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header">
                                <h6 className="card-title mb-0">
                                  <FiShoppingBag className="me-2" />
                                  Détails des Bons d'Achat (
                                  {productSearchData.bonAchatDetails.length})
                                </h6>
                              </div>
                              <div className="card-body">
                                {productSearchData.bonAchatDetails.map(
                                  (bonAchat, index) => (
                                    <div
                                      key={index}
                                      className="mb-4 p-3 border rounded"
                                    >
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                          <h5 className="mb-1">
                                            {bonAchat.num_bon_achat}
                                          </h5>
                                          <p className="text-muted mb-0">
                                            Date:{" "}
                                            {formatDate(bonAchat.date_creation)}{" "}
                                            | Statut:{" "}
                                            <span
                                              className={`badge ${getStatusColor(bonAchat.status)}`}
                                            >
                                              {getStatusText(bonAchat.status)}
                                            </span>
                                          </p>
                                        </div>
                                        <div className="text-end">
                                          <h5 className="text-success mb-0">
                                            {bonAchat.montant_ttc}
                                          </h5>
                                          <small className="text-muted">
                                            {bonAchat.mode_reglement}
                                          </small>
                                        </div>
                                      </div>

                                      <div className="table-responsive">
                                        <table className="table table-sm">
                                          <thead>
                                            <tr>
                                              <th>Produit</th>
                                              <th>Référence</th>
                                              <th>Quantité</th>
                                              <th>Prix Unitaire</th>
                                              <th>Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {bonAchat.lignes.map(
                                              (ligne, lineIndex) => (
                                                <tr key={lineIndex}>
                                                  <td>
                                                    {ligne.produit?.designation}
                                                  </td>
                                                  <td>
                                                    <span className="badge bg-light text-dark">
                                                      {ligne.produit?.reference}
                                                    </span>
                                                  </td>
                                                  <td>{ligne.quantite}</td>
                                                  <td>{ligne.prix_unitaire}</td>
                                                  <td>
                                                    <strong className="text-success">
                                                      {ligne.total_ligne}
                                                    </strong>
                                                  </td>
                                                </tr>
                                              ),
                                            )}
                                          </tbody>
                                        </table>
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
                                Historique des Achats (
                                {productSearchData.history.length} entrée(s))
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead>
                                    <tr>
                                      <th>Numéro BA</th>
                                      <th>Date</th>
                                      <th>Produit</th>
                                      <th>Quantité</th>
                                      <th>Prix Unitaire</th>
                                      <th>Total Ligne</th>
                                      <th>Statut</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productSearchData.history.map(
                                      (item, index) => (
                                        <tr key={index}>
                                          <td>
                                            <strong>
                                              {item.document?.num}
                                            </strong>
                                          </td>
                                          <td>
                                            <span className="d-flex align-items-center">
                                              <FiCalendar className="me-1 text-muted" />
                                              {formatDate(item.issueDate || item.date_creation)}
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
                                              {item.prix_unitaire}
                                            </strong>
                                          </td>
                                          <td>
                                            <strong className="text-success">
                                              {item.total_ligne}
                                            </strong>
                                          </td>
                                          <td>
                                            <span
                                              className={`badge ${getStatusColor(item.document?.status)}`}
                                            >
                                              {getStatusText(
                                                item.document?.status,
                                              )}
                                            </span>
                                          </td>
                                          <td>
                                            <button
                                              className="btn btn-sm btn-outline-primary"
                                              onClick={() =>
                                                handleViewBonAchat(
                                                  item.document?.id,
                                                )
                                              }
                                              title="Voir le bon d'achat"
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
                                Aucun achat trouvé pour la référence "
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
                    {productSearchLoading || (!allProductsStats && !productSearchData) ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                        <p className="mt-3">Chargement des produits...</p>
                      </div>
                    ) : (allProductsStats && allProductsStats.products) ? (
                      <>
                        {/* Statistics Cards for All Products */}
                        <div className="row mb-4">
                          <div className="col-xl-3 col-md-6 mb-3">
                            <div className="card border-primary">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="text-muted mb-1">Total Produits</h6>
                                    <h3 className="mb-0">{allProductsStats.statistics?.totalProducts || 0}</h3>
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
                                    <h6 className="text-muted mb-1">Quantité Totale</h6>
                                    <h3 className="mb-0">{allProductsStats.statistics?.totalQuantity || 0}</h3>
                                  </div>
                                  <div className="bg-info bg-opacity-10 p-3 rounded">
                                    <FiTrendingUp size={24} className="text-white" />
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
                                    <h6 className="text-muted mb-1">Montant Total</h6>
                                    <h3 className="mb-0">{formatCurrency(allProductsStats.statistics?.totalAmount || 0)}</h3>
                                  </div>
                                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                                    <FiDollarSign size={24} className="text-white" />
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
                                    <h6 className="text-muted mb-1">Moyenne/Produit</h6>
                                    <h3 className="mb-0">{formatCurrency(allProductsStats.statistics?.averagePerProduct || 0)}</h3>
                                  </div>
                                  <div className="bg-success bg-opacity-10 p-3 rounded">
                                    <FiTrendingUp size={24} className="text-white" />
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
                                    Tous les Produits ({allProductsStats.products.length})
                                  </h6>
                                </div>
                                <div className="card-body">
                                  <div className="table-responsive">
                                    <table className="table table-hover">
                                      <thead>
                                        <tr>
                                          <th>Produit</th>
                                          <th>Référence</th>
                                          <th className="text-center">Quantité Totale</th>
                                          <th className="text-end">Montant Total</th>
                                          <th className="text-center">Premier Achat</th>
                                          <th className="text-center">Dernier Achat</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allProductsStats.products.map((product, index) => (
                                          <tr key={index}>
                                            <td><strong>{product.product?.designation}</strong></td>
                                            <td><span className="text-muted">{product.product?.reference}</span></td>
                                            <td className="text-center">
                                              <span className="badge bg-primary">{product.totalQuantity}</span>
                                            </td>
                                            <td className="text-end">
                                              <strong className="text-success">{formatCurrency(product.totalAmount)}</strong>
                                            </td>
                                            <td className="text-center">
                                              <small className="text-muted">{formatDateShort(product.firstPurchase)}</small>
                                            </td>
                                            <td className="text-center">
                                              <small className="text-muted">{formatDateShort(product.lastPurchase)}</small>
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
                        ) : (
                          <div className="text-center py-5">
                            <FiBox size={48} className="text-muted mb-3" />
                            <h5>Aucun produit trouvé</h5>
                            <p className="text-muted mb-4">
                              Ce fournisseur n'a pas de produits pour cette période.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-5">
                        <FiBox size={48} className="text-muted mb-3" />
                        <h5>Aucun produit trouvé</h5>
                        <p className="text-muted mb-4">
                          Utilisez les filtres ci-dessus ou entrez une référence pour rechercher.
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

      {/* Recent BonAchats - Only show when NOT in product search mode */}
      {!showProductSearch && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <FiShoppingBag className="me-2" />
                  Bons d'Achat Récents
                </h5>
                <div className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm w-auto"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="brouillon">Non Paye</option>
                    <option value="commandé">Commandé</option>
                    <option value="partiellement_reçu">
                      Partiellement Reçu
                    </option>
                    <option value="reçu">Reçu</option>
                    <option value="partiellement_payée">
                      Partiellement Payé
                    </option>
                    <option value="payé">Payé</option>
                    <option value="annulé">Annulé</option>
                  </select>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={fetchFornisseurData}
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-5">
                    <FiShoppingBag size={48} className="text-muted mb-3" />
                    <h5>Aucun bon d'achat trouvé</h5>
                    <p className="text-muted">
                      Aucun bon d'achat ne correspond aux filtres sélectionnés
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Numéro</th>
                          <th>Date</th>
                          <th>Montant HT</th>
                          <th>Montant TTC</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((fa, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{fa.invoiceNumber}</strong>
                            </td>
                            <td>
                              <span className="d-flex align-items-center">
                                <FiCalendar className="me-1 text-muted" />
                                {formatDate(fa.issueDate)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold">
                                {formatCurrency(fa.totalHT)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold">
                                {formatCurrency(fa.totalTTC)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getStatusColor(fa.status)}`}
                              >
                                {getStatusIcon(fa.status)}
                                {getStatusText(fa.status)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    navigate(`/facture-achat/${fa.id}`)
                                  }
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
    </div>
  );
}

export default FornisseurDetails;
