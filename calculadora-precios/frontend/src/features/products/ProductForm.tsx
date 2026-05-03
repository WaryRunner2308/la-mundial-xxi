import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useProviderStore } from '../../store/providerStore';
import { formatAmountWithCurrency } from '../../utils/format';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { uploadProductImage } from '../../lib/supabase';
import { validateDecimalInput, parseNumericInput } from '../../utils/validateDecimal';
import { SecureInput } from '../../components/ui/SecureInput';

type Currency = 'Bs' | 'USD';

interface FormData {
  name: string;
  cost: string;
  currency: Currency;
  profitPercentage: string;
  aplicarIVA: boolean;
  photoPreview: string | null;
  providerId?: number;
  packageType: 'unit' | 'bulk';
  unitsPerBulk: string;
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

function getCostPerUnit(data: FormData): number {
  let cost = parseNumericInput(data.cost);
  if (data.packageType === 'bulk' && data.unitsPerBulk) {
    const units = parseNumericInput(data.unitsPerBulk);
    if (units > 0) cost = cost / units;
  }
  return cost;
}

function calculateLive(
  data: FormData,
  rate: number,
  setLiveResults: React.Dispatch<React.SetStateAction<LiveResults | null>>
) {
  const costPerUnit = getCostPerUnit(data);
  const profit = parseNumericInput(data.profitPercentage);

  if (costPerUnit <= 0 || profit < 0 || profit >= 100) {
    setLiveResults(null);
    return;
  }

  const divisor = 1 - (profit / 100);
  const priceBase = costPerUnit / divisor;
  const utility = priceBase - costPerUnit;
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
    packageType: 'unit',
    unitsPerBulk: '',
  });
   const [liveResults, setLiveResults] = useState<LiveResults | null>(null);
   const [isUploading, setIsUploading] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [showConfirm, setShowConfirm] = useState(false);

  const rate = useCurrencyStore((state) => state.rate);
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      currency: 'Bs',
      profitPercentage: '',
      aplicarIVA: false,
      photoPreview: null,
      providerId: undefined,
      packageType: 'unit',
      unitsPerBulk: '',
    });
    setLiveResults(null);
  };

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
        packageType: 'unit',
        unitsPerBulk: '',
      };
      setFormData(formDataToSet);
      calculateLive(formDataToSet, rate, setLiveResults);
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, productToEdit, rate]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    calculateLive({ ...formData, name: value }, rate, setLiveResults);
  };

  const handleCostChange = (value: string) => {
    setFormData(prev => ({ ...prev, cost: value }));
    calculateLive({ ...formData, cost: value }, rate, setLiveResults);
  };

  const handleProfitChange = (value: string) => {
    setFormData(prev => ({ ...prev, profitPercentage: value }));
    calculateLive({ ...formData, profitPercentage: value }, rate, setLiveResults);
  };

  const handleUnitsChange = (value: string) => {
    setFormData(prev => ({ ...prev, unitsPerBulk: value }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    calculateLive({ ...formData, currency: newCurrency }, rate, setLiveResults);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setFormData(prev => ({ ...prev, providerId }));
  };

  const handlePackageTypeChange = (value: 'unit' | 'bulk') => {
    setFormData(prev => ({
      ...prev,
      packageType: value,
      unitsPerBulk: value === 'unit' ? '' : prev.unitsPerBulk
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setFormData(prev => ({ ...prev, aplicarIVA: newValue }));
    calculateLive({ ...formData, aplicarIVA: newValue }, rate, setLiveResults);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await imageToBase64(file, 300);
      setFormData(prev => ({ ...prev, photoPreview: base64 }));
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      alert('Error al cargar la imagen. Verifique que sea un archivo válido (JPEG, PNG, WebP). Intente con otra.');
      // Limpiar input
      e.target.value = '';
    } finally {
      setIsUploading(false);
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

  const submitForm = async () => {
    if (!formData.name || !formData.cost || !formData.profitPercentage) {
      alert('Complete todos los campos requeridos');
      return;
    }

    const costPerUnit = getCostPerUnit(formData);
    const profit = parseNumericInput(formData.profitPercentage);
    const divisor = 1 - (profit / 100);
    const priceBase = costPerUnit / divisor;
    const utility = priceBase - costPerUnit;
    const priceWithVAT = formData.aplicarIVA ? priceBase * 1.16 : priceBase;

    setIsSubmitting(true);
    try {
       if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: formData.name,
          cost: costPerUnit,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || null,
          providerId: formData.providerId,
        });
      } else {
        await addProduct({
          name: formData.name,
          cost: costPerUnit,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || null,
          providerId: formData.providerId,
        });
      }
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Error completo al guardar:', error);
      alert(`Error al guardar: ${error.message}\n\nRevisa la consola (F12) para detalles.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    submitForm();
  };

  function imageToBase64(file: File, maxWidth = 300): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error(`Tipo de archivo no soportado: ${file.type}. Use JPEG, PNG o WebP.`));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);

      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
        img.src = reader.result as string;

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            // Validar dimensiones mínimas
            if (width < 1 || height < 1) {
              reject(new Error('Dimensiones de imagen inválidas'));
              return;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('No se pudo crear contexto de canvas'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            resolve(base64);
          } catch (err: any) {
            reject(new Error(`Error procesando imagen: ${err.message}`));
          }
        };
      };
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Input fantasma global para capturar autocompletado */}
        <input
          type="text"
          name={`global_decoy_${Date.now()}`}
          autoComplete="new-password"
          style={{ position: 'absolute', left: '-1000px', top: '-1000px', opacity: 0, height: 0, width: 0 }}
          tabIndex={-1}
          readOnly
        />

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {productToEdit ? 'Editar Producto' : 'Agregar Producto Nuevo'}
          </h2>
        </div>

        {/* Nombre */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Producto *
          </span>
          <SecureInput
            value={formData.name}
            onChange={handleNameChange}
            onSubmit={submitForm}
            placeholder="Ej: Malta 1.5L"
            inputMode="text"
            editable
          />
        </div>

        {/* Costo con selector de moneda */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Costo *
          </span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <div className="flex-1 min-w-0">
               <SecureInput
                 value={formData.cost}
                 onChange={handleCostChange}
                 onSubmit={submitForm}
                 placeholder="0.00"
                 inputMode="decimal"
                 editable
                 displayClassName="border-0 rounded-none focus:ring-0 focus:border-none bg-white text-base min-h-[48px] flex-1"
               />
            </div>
            <select
              value={formData.currency}
              onChange={handleCurrencyChange}
              className="w-20 md:w-32 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-gray-50 text-gray-700 text-sm md:text-base font-medium cursor-pointer shrink-0"
            >
              <option value="Bs">Bs</option>
              <option value="USD">$</option>
            </select>
          </div>
        </div>

        {/* Selector de Tipo de Empaque */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de empaque
          </span>
          <div className="flex gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pkg_type"
                value="unit"
                checked={formData.packageType === 'unit'}
                onChange={() => handlePackageTypeChange('unit')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Unidad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pkg_type"
                value="bulk"
                checked={formData.packageType === 'bulk'}
                onChange={() => handlePackageTypeChange('bulk')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Bulto</span>
            </label>
          </div>
        </div>

        {/* Unidades por Bulto */}
        {formData.packageType === 'bulk' && (
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Unidades por bulto *
            </span>
            <SecureInput
              value={formData.unitsPerBulk}
              onChange={handleUnitsChange}
              onSubmit={submitForm}
              placeholder="Ej: 10"
              inputMode="numeric"
              editable
            />
            {formData.cost && formData.unitsPerBulk && parseNumericInput(formData.unitsPerBulk) > 0 && (
              <p className="mt-2 text-sm text-blue-600 font-medium">
                💡 Costo unitario resultante: {formatAmountWithCurrency(
                  getCostPerUnit(formData),
                  formData.currency
                )}
              </p>
            )}
          </div>
        )}

        {/* % Ganancia */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            % Ganancia *
          </span>
            <SecureInput
              value={formData.profitPercentage}
              onChange={handleProfitChange}
              onSubmit={submitForm}
              placeholder="Ej: 30"
              inputMode="decimal"
              editable
            />
        </div>

        {/* Proveedor */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Proveedor
          </span>
          <select
            value={formData.providerId ?? ''}
            onChange={handleProviderChange}
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
        <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50 mb-6">
          <input
            id="aplicarIVA"
            type="checkbox"
            checked={formData.aplicarIVA}
            onChange={handleCheckboxChange}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-1" onClick={() => setFormData(prev => ({ ...prev, aplicarIVA: !prev.aplicarIVA }))}>
            Aplicar IVA (16%)
          </span>
        </div>

        {/* Foto del Producto */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Foto del Producto (opcional)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
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
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border shadow-sm mb-6">
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
                  <span className="block text-sm text-gray-500">
                    {formatAmountWithCurrency(liveResults.utilityConverted, liveResults.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {liveResults && rate === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
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
            disabled={isSubmitting}
            className="flex-1 h-12 px-6 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-lg text-white font-semibold transition disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              productToEdit ? '💾 Actualizar Producto' : '💾 Guardar Producto'
            )}
          </button>
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
    </div>
  );
}
