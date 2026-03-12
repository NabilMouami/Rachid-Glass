import React, { useState, useEffect } from "react";
import {
  FiSave,
  FiPackage,
  FiHash,
  FiTag,
  FiDollarSign,
  FiUser,
  FiSquare,
} from "react-icons/fi";
import topTost from "@/utils/topTost";
import axios from "axios";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

function ProduitsCreate() {
  // Form state - keeping your original structure + adding missing fields
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [observation, setObservation] = useState("");
  const [qty, setQty] = useState(0);
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");

  // New fields from your model
  const [L1, setL1] = useState("");
  const [L2, setL2] = useState("");
  const [surface, setSurface] = useState(0);
  const [prixTotal, setPrixTotal] = useState("");
  const [prixVenteMin, setPrixVenteMin] = useState("");
  const [prixVenteMax, setPrixVenteMax] = useState("");
  const [fornisseurId, setFornisseurId] = useState("");

  // Additional state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculations, setCalculations] = useState({
    marge: 0,
    margePourcentage: 0,
    surface: 0,
    prixTotalAuto: 0,
  });

  // Fournisseurs state - initialize as empty array
  const [fournisseurs, setFournisseurs] = useState([]);

  // Fetch fournisseurs on component mount
  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const fetchFournisseurs = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/fornisseurs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure response.data is an array
      setFournisseurs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
      setFournisseurs([]); // Set empty array on error
    }
  };

  // Calculate surface when dimensions change
  useEffect(() => {
    if (L1 && L2) {
      const lengthInM = parseFloat(L1) / 100;
      const widthInM = parseFloat(L2) / 100;
      const calculatedSurface = lengthInM * widthInM;
      setSurface(calculatedSurface.toFixed(2));
    } else {
      setSurface(0);
    }
  }, [L1, L2]);

  // Calculate margin when prices change - keeping your original logic
  useEffect(() => {
    if (prixAchat && prixVente) {
      const achat = parseFloat(prixAchat);
      const vente = parseFloat(prixVente);
      const marge = vente - achat;
      const margePourcentage = achat > 0 ? (marge / achat) * 100 : 0;

      setCalculations((prev) => ({
        ...prev,
        marge: marge.toFixed(2),
        margePourcentage: margePourcentage.toFixed(2),
      }));
    }
  }, [prixAchat, prixVente]);

  // Calculate total price when dimensions, prices, or quantity change
  useEffect(() => {
    const vente = parseFloat(prixVente) || 0;
    const qtyValue = parseInt(qty) || 0;
    const surfaceValue = parseFloat(surface) || 0;

    // Prix total (surface * prix_vente * qty)
    const prixTotalAuto = surfaceValue * vente * qtyValue;

    setCalculations((prev) => ({
      ...prev,
      surface: surfaceValue,
      prixTotalAuto: prixTotalAuto.toFixed(2),
    }));

    // Auto-set prix_total if not manually set
    if (!prixTotal && prixTotalAuto > 0) {
      setPrixTotal(prixTotalAuto.toFixed(2));
    }
  }, [prixVente, qty, surface, prixTotal]);

  // Validate min/max prices
  useEffect(() => {
    if (prixVenteMin && prixVenteMax) {
      const min = parseFloat(prixVenteMin);
      const max = parseFloat(prixVenteMax);
      if (min > max) {
        topTost(
          "Le prix minimum ne peut pas être supérieur au prix maximum",
          "warning",
        );
      }
    }
  }, [prixVenteMin, prixVenteMax]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!reference || !designation || !prixAchat || !prixVente) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }

      const achat = parseFloat(prixAchat);
      const vente = parseFloat(prixVente);

      if (vente <= achat) {
        throw new Error("Le prix de vente doit être supérieur au prix d'achat");
      }

      // Validate min/max if both provided
      if (prixVenteMin && prixVenteMax) {
        const min = parseFloat(prixVenteMin);
        const max = parseFloat(prixVenteMax);
        if (min > max) {
          throw new Error(
            "Le prix de vente minimum ne peut pas être supérieur au prix maximum",
          );
        }
      }

      const produitData = {
        reference,
        designation,
        observation,
        qty: parseInt(qty) || 0,
        prix_achat: achat,
        prix_vente: vente,
        // New fields
        L1: L1 ? parseInt(L1) : null,
        L2: L2 ? parseInt(L2) : null,
        surface: parseFloat(surface) || 0,
        prix_total: prixTotal
          ? parseFloat(prixTotal)
          : calculations.prixTotalAuto > 0
            ? parseFloat(calculations.prixTotalAuto)
            : null,
        prix_vente_min: prixVenteMin ? parseFloat(prixVenteMin) : null,
        prix_vente_max: prixVenteMax ? parseFloat(prixVenteMax) : null,
        fornisseurId: fornisseurId ? parseInt(fornisseurId) : null,
      };

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const response = await axios.post(
        `${config_url}/api/produits`,
        produitData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      MySwal.fire({
        title: "Succès!",
        text: "Produit créé avec succès",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        // Reset form
        setReference("");
        setDesignation("");
        setObservation("");
        setQty(0);
        setPrixAchat("");
        setPrixVente("");
        setL1("");
        setL2("");
        setSurface(0);
        setPrixTotal("");
        setPrixVenteMin("");
        setPrixVenteMax("");
        setFornisseurId("");
        setCalculations({
          marge: 0,
          margePourcentage: 0,
          surface: 0,
          prixTotalAuto: 0,
        });
      });
    } catch (error) {
      console.error("Error creating produit:", error);

      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err) => err.message)
          .join(", ");
        topTost(errorMessages, "error");
      } else if (error.response?.data?.field === "reference") {
        topTost(
          "Cette référence est déjà utilisée par un autre produit",
          "error",
        );
      } else {
        topTost(
          error.response?.data?.message ||
            error.message ||
            "Erreur lors de la création du produit",
          "error",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReferenceChange = (e) => {
    const value = e.target.value;
    const formattedValue = value.replace(/[^a-zA-Z0-9-_.]/g, "");
    setReference(formattedValue.toUpperCase());
  };

  const handlePriceChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleDimensionChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setter(value);
    }
  };

  const handleQtyChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setQty(value === "" ? 0 : parseInt(value));
    }
  };

  return (
    <>
      <div className="main-content">
        <div className="row">
          <form className="col-xl-12" onSubmit={handleSubmit}>
            <div className="card stretch stretch-full">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <FiPackage className="me-2" />
                  Nouveau Produit
                </h5>
              </div>
              <div className="card-body">
                {/* Reference and Designation */}
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiHash size={16} className="me-1" />
                      Référence <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: PROD-001, SKU-2024"
                      value={reference}
                      onChange={handleReferenceChange}
                      required
                      maxLength="100"
                    />
                    <small className="text-muted">
                      Doit être unique (max 100 caractères)
                    </small>
                  </div>

                  <div className="col-md-6 mb-4">
                    <label className="form-label">
                      <FiTag size={16} className="me-1" />
                      Quantité initiale
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0"
                      value={qty}
                      onChange={handleQtyChange}
                      min="0"
                    />
                    <small className="text-muted">
                      Quantité en stock initiale
                    </small>
                  </div>
                </div>

                {/* Designation */}
                <div className="mb-4">
                  <label className="form-label">
                    <FiPackage size={16} className="me-1" />
                    Désignation <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Description détaillée du produit..."
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    rows="3"
                    required
                  />
                </div>

                {/* NEW: Dimensions */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Longueur (L1) en cm</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="500"
                        value={L1}
                        onChange={handleDimensionChange(setL1)}
                      />
                      <span className="input-group-text">cm</span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Largeur (L2) en cm</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="500"
                        value={L2}
                        onChange={handleDimensionChange(setL2)}
                      />
                      <span className="input-group-text">cm</span>
                    </div>
                  </div>
                </div>

                {/* NEW: Surface display */}
                {surface > 0 && (
                  <div className="row mb-4">
                    <div className="col-md-12">
                      <div className="alert alert-info">
                        <FiSquare className="me-2" />
                        <strong>Surface calculée:</strong> {surface} m²
                      </div>
                    </div>
                  </div>
                )}

                {/* Prices */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix d'achat au m² <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixAchat}
                        onChange={handlePriceChange(setPrixAchat)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix de vente au m² <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixVente}
                        onChange={handlePriceChange(setPrixVente)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* NEW: Price ranges */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix vente minimum (optionnel)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixVenteMin}
                        onChange={handlePriceChange(setPrixVenteMin)}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix vente maximum (optionnel)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={prixVenteMax}
                        onChange={handlePriceChange(setPrixVenteMax)}
                      />
                    </div>
                  </div>
                </div>

                {/* NEW: Total price and Fournisseur */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      <FiDollarSign size={16} className="me-1" />
                      Prix total tablette (optionnel)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">DH</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Auto-calculé"
                        value={prixTotal}
                        onChange={handlePriceChange(setPrixTotal)}
                      />
                    </div>
                    <small className="text-muted">
                      Laissez vide pour auto-calcul
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      <FiUser size={16} className="me-1" />
                      Fournisseur
                    </label>
                    <select
                      className="form-select"
                      value={fornisseurId}
                      onChange={(e) => setFornisseurId(e.target.value)}
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {fournisseurs.length > 0 ? (
                        fournisseurs.map((fournisseur) => (
                          <option key={fournisseur.id} value={fournisseur.id}>
                            {fournisseur.nom ||
                              fournisseur.name ||
                              `Fournisseur ${fournisseur.id}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Aucun fournisseur disponible
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Margin calculation */}
                {prixAchat && prixVente && (
                  <div className="row mb-4">
                    <div className="col-md-12">
                      <div className="alert alert-light">
                        <div className="row">
                          <div className="col-md-3">
                            <strong>Marge au m²:</strong> {calculations.marge}{" "}
                            DH
                          </div>
                          <div className="col-md-2">
                            <strong>Taux:</strong>{" "}
                            {calculations.margePourcentage}%
                          </div>
                          {surface > 0 && (
                            <>
                              <div className="col-md-3">
                                <strong>Surface:</strong> {calculations.surface}{" "}
                                m²
                              </div>
                              <div className="col-md-4">
                                <strong>Valeur stock:</strong>{" "}
                                {calculations.prixTotalAuto} DH
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setReference("");
                      setDesignation("");
                      setObservation("");
                      setQty(0);
                      setPrixAchat("");
                      setPrixVente("");
                      setL1("");
                      setL2("");
                      setSurface(0);
                      setPrixTotal("");
                      setPrixVenteMin("");
                      setPrixVenteMax("");
                      setFornisseurId("");
                      setCalculations({
                        marge: 0,
                        margePourcentage: 0,
                        surface: 0,
                        prixTotalAuto: 0,
                      });
                    }}
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    <FiSave size={16} className="me-2" />
                    <span>
                      {isSubmitting
                        ? "Création en cours..."
                        : "Enregistrer le produit"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ProduitsCreate;
