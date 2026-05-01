import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useProviderStore } from '../../store/providerStore';
import { formatAmountWithCurrency } from '../../utils/format';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { uploadProductImage, deleteProductImage } from '../../lib/supabase';
import { validateDecimalInput, parseNumericInput } from '../../utils/validateDecimal';

type Currency = 'Bs' | 'USD';

interface FormData {
  name: string;
  cost: string;
  currency: Currency;
  profitPercentage: string;
  aplicarIVA: boolean;
  photoPreview: string | null;
  providerId?: number;
}

interface LiveResults {
  priceWithVAT: number;
  utility: number;
  currency: Currency;
  priceWithVATConverted?: number;
  utilityConverted?: number;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: {
    id: number;
    name: string;
    cost: number;
    currency: Currency;
    profitPercentage: number;
    exemptFromVAT: boolean;
    photoUrl: string;
    providerId?: number;
  } | null;
  onSave?: () => void;
}

function calculateLive(
  data: FormData,
  rate: number,
  setLiveResults: React.Dispatch<React.SetStateAction<LiveResults | null>>
) {
  const cost = parseNumericInput(data.cost);
  const profit = parseNumericInput(data.profitPercentage);

  if (cost <= 0 || profit < 0 || profit >= 100) {
    setLiveResults(null);
    return;
  }

  const divisor = 1 - (profit / 100);
  const priceBase = cost / divisor;
  const utility = priceBase - cost;
  const priceWithVAT = data.aplicarIVA ? priceBase * 1.16 : priceBase;

  let priceWithVATConverted = priceWithVAT;
  let utilityConverted = utility;

  if (rate > 0) {
    if (data.currency === 'Bs') {
      priceWithVATConverted = priceWithVAT / rate;
      utilityConverted = utility / rate;
    } else {
      priceWithVATConverted = priceWithVAT * rate;
      utilityConverted = utility * rate;
    }
  }

  setLiveResults({
    priceWithVAT: Number(priceWithVAT.toFixed(2)),
    utility: Number(utility.toFixed(2)),
    currency: data.currency,
    priceWithVATConverted: Number(priceWithVATConverted.toFixed(2)),
    utilityConverted: Number(utilityConverted.toFixed(2)),
  });
}

export function ProductForm({ isOpen, onClose, productToEdit, onSave }: ProductFormProps) {
  const { providers, fetchProviders } = useProviderStore();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cost: '',
    currency: 'Bs',
    profitPercentage: '',
    aplicarIVA: false,
    photoPreview: null,
    providerId: undefined,
  });
  const [liveResults, setLiveResults] = useState<LiveResults | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const rate = useCurrencyStore((state) => state.rate);

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      currency: 'Bs',
      profitPercentage: '',
      aplicarIVA: false,
      photoPreview: null,
      providerId: undefined,
    });
    setLiveResults(null);
  };

  // Cargar proveedores al montar
  useEffect(() => {
    if (isOpen) {
      fetchProviders().catch(() => {
        console.warn('No se pudieron cargar proveedores');
      });
    }
  }, [isOpen, fetchProviders]);

  useEffect(() => {
    if (isOpen && productToEdit) {
      const formDataToSet: FormData = {
        name: productToEdit.name,
        cost: productToEdit.cost.toString(),
        currency: productToEdit.currency,
        profitPercentage: productToEdit.profitPercentage.toString(),
        aplicarIVA: !productToEdit.exemptFromVAT,
        photoPreview: productToEdit.photoUrl || null,
        providerId: productToEdit.providerId,
      };
      setFormData(formDataToSet);
      calculateLive(formDataToSet, rate, setLiveResults);
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, productToEdit, rate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newData: FormData;
    if (name === 'providerId') {
      newData = { ...formData, providerId: value ? parseInt(value, 10) : undefined };
    } else {
      const cleanedValue = name === 'cost' || name === 'profitPercentage' ? validateDecimalInput(value) : value;
      newData = { ...formData, [name]: cleanedValue };
    }
    setFormData(newData);
    calculateLive(newData, rate, setLiveResults);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...formData, aplicarIVA: e.target.checked };
    setFormData(newData);
    calculateLive(newData, rate, setLiveResults);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const base64 = await imageToBase64(file, 300);
        setFormData(prev => ({ ...prev, photoPreview: base64 }));
      } catch (error) {
        console.error('Error al procesar imagen:', error);
        alert('Error al cargar la imagen. Intente con otra.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoPreview: null }));
  };

  const handleCancel = () => {
    const hasData = formData.name.trim() !== '' || formData.cost !== '' || formData.profitPercentage !== '';
    if (!hasData) {
      onClose();
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmCancel = () => {
    resetForm();
    setShowConfirm(false);
    onClose();
  };

  const handleContinueEdit = () => {
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cost || !formData.profitPercentage) {
      alert('Complete todos los campos requeridos');
      return;
    }

    const cost = parseNumericInput(formData.cost);
    const profit = parseNumericInput(formData.profitPercentage);
    const divisor = 1 - (profit / 100);
    const priceBase = cost / divisor;
    const utility = priceBase - cost;
    const priceWithVAT = formData.aplicarIVA ? priceBase * 1.16 : priceBase;

    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: formData.name,
          cost: cost,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || '',
          providerId: formData.providerId,
        });
      } else {
        await addProduct({
          name: formData.name,
          category: "",
          cost: cost,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || '',
          providerId: formData.providerId,
        });
      }
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Error completo al guardar:', error);
      alert(`Error al guardar: ${error.message}\n\nRevisa la consola (F12) para detalles.`);
    }
  };

  function imageToBase64(file: File, maxWidth = 300): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {productToEdit ? 'Editar Producto' : 'Agregar Producto Nuevo'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              autoComplete="off"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base"
            />
          </div>

          {/* Costo con selector de moneda */}
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
              Costo *
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
               <input
                 id="cost"
                 name="cost"
                 type="text"
                 inputMode="decimal"
                 pattern="[0-9,.]*"
                 autoComplete="new-password"
                 autoCorrect="off"
                 spellCheck="false"
                 value={formData.cost}
                  onChange={(e) => {
                    const newFormData = { ...formData, cost: e.target.value };
                    setFormData(newFormData);
                    calculateLive(newFormData, rate, setLiveResults);
                  }}
                 required
                 className="flex-1 min-w-0 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-white text-base"
               />
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-20 md:w-32 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-gray-50 text-gray-700 text-sm md:text-base font-medium cursor-pointer shrink-0"
              >
                <option value="Bs">Bs</option>
                <option value="USD">$</option>
              </select>
            </div>
          </div>

          {/* % Ganancia */}
          <div>
            <label htmlFor="profitPercentage" className="block text-sm font-medium text-gray-700 mb-2">
              % Ganancia *
            </label>
            <input
              id="profitPercentage"
              name="profitPercentage"
              type="text"
              inputMode="decimal"
              pattern="[0-9,.]*"
              autoComplete="new-password"
              autoCorrect="off"
              spellCheck="false"
              value={formData.profitPercentage}
                  onChange={(e) => {
                    const newFormData = { ...formData, cost: e.target.value };
                    setFormData(newFormData);
                    calculateLive(newFormData, rate, setLiveResults);
                  }}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base"
            />
          </div>

          {/* Proveedor */}
          <div>
            <label htmlFor="providerId" className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor
            </label>
            <select
              id="providerId"
              name="providerId"
              value={formData.providerId ?? ''}
                   onChange={(e) => {
                     const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                     const newFormData = { ...formData, providerId: value };
                     setFormData(newFormData);
                     calculateLive(newFormData, rate, setLiveResults);
                   }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base bg-white"
            >
              <option value="">Seleccionar proveedor</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* IVA Checkbox */}
          <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <input
              id="aplicarIVA"
              name="aplicarIVA"
              type="checkbox"
              checked={formData.aplicarIVA}
              onChange={handleCheckboxChange}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="aplicarIVA" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-1">
              Aplicar IVA (16%)
            </label>
          </div>

          {/* Foto del Producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto del Producto (opcional)
            </label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              autoComplete="off"
            />
            {isUploading && (
              <p className="text-xs text-gray-500 mt-1">Procesando imagen...</p>
            )}
            {formData.photoPreview && (
              <div className="mt-4 p-2 bg-gray-50 rounded-lg relative inline-block">
                <img src={formData.photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow-md" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md transition"
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Cálculo en Vivo */}
          {liveResults && rate > 0 && (
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border shadow-sm">
              <h4 className="text-lg font-semibold mb-4 text-emerald-800">📊 Cálculo en Vivo</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="text-center p-6 bg-white rounded-xl shadow-sm border-2 border-blue-100">
                  <span className="block text-gray-600 mb-2 text-lg">Precio Final</span>
                  <span className="block font-bold text-3xl text-blue-600">
                    {formatAmountWithCurrency(liveResults.priceWithVAT, liveResults.currency)}
                  </span>
                  {rate > 0 && liveResults.priceWithVATConverted !== undefined && (
                    <span className="block text-sm text-gray-500 mt-1">
                      {formatAmountWithCurrency(liveResults.priceWithVATConverted, liveResults.currency === 'Bs' ? 'USD' : 'Bs')}
                    </span>
                  )}
                </div>
                <div className="text-center p-6 bg-white rounded-xl shadow-sm border-2 border-emerald-100">
                  <span className="block text-gray-600 mb-2 text-lg">Ganancia</span>
                  <span className="block font-bold text-3xl text-emerald-600">
                    {formatAmountWithCurrency(liveResults.utility, liveResults.currency)}
                  </span>
                  {rate > 0 && liveResults.utilityConverted !== undefined && (
                    <span className="block text-sm text-gray-500 mt-1">
                      {formatAmountWithCurrency(liveResults.utilityConverted, liveResults.currency === 'Bs' ? 'USD' : 'Bs')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {liveResults && rate === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                ⚠️ La tasa de cambio no está configurada. Los valores se muestran solo en la moneda original.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-12 px-6 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-lg text-white font-semibold transition"
            >
              {productToEdit ? '💾 Actualizar Producto' : '💾 Guardar Producto'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={showConfirm}
        title="Confirmar cancelación"
        message="¿Estás seguro de cancelar? Se perderán los datos ingresados."
        confirmText="Sí, cancelar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmCancel}
        onCancel={handleContinueEdit}
      />
    </div>
  );
}
