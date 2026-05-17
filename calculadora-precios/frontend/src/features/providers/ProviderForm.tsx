import React, { useState, useEffect } from 'react';
import { useProviderStore } from '../../store/providerStore';
import { SecureInput } from '@/components/ui/SecureInput';

interface ProviderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  editingProvider?: { id: number; name: string } | null;
}

export function ProviderForm({ isOpen, onClose, onSave, editingProvider }: ProviderFormProps) {
  const { addProvider, updateProvider } = useProviderStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingProvider) {
      setName(editingProvider.name);
    } else {
      setName('');
    }
    setError(null);
  }, [editingProvider, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, name.trim());
      } else {
        await addProvider(name.trim());
      }
      onSave?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingProvider ? 'Editar Proveedor' : 'Agregar Proveedor'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {editingProvider ? 'Modifica el nombre del proveedor' : 'Registra un nuevo proveedor para tus productos'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
          <div>
            <label htmlFor="providerName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Proveedor *
            </label>
            <SecureInput
              value={name}
              onChange={setName}
              placeholder="Ej: Polar, Coca-Cola, Luventa"
              inputMode="text"
              editable
              noRing={true}
              displayClassName="border border-gray-300 rounded-lg px-4 py-3 outline-none transition bg-white focus:ring-0 focus:border-gray-300 text-base"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (editingProvider ? 'Actualizar' : 'Agregar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
