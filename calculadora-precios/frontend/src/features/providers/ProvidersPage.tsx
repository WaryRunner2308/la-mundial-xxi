import React, { useState, useEffect } from 'react';
import { useProviderStore } from '../../store/providerStore';
import { useProductStore } from '@/store/productStore';
import { useNavigate } from 'react-router-dom';
import { ProviderForm } from '../providers/ProviderForm';
import { ProviderProductsModal } from './ProviderProductsModal';

export function ProvidersPage() {
  const { providers, loading, error, fetchProviders, deleteProvider } = useProviderStore();
  const [editingProvider, setEditingProvider] = useState<{ id: number; name: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProviders().catch(() => {
      // Error handled in store
    });
  }, [fetchProviders]);

  const handleEdit = (provider: { id: number; name: string }) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProvider(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting provider:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Proveedores
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Gestiona los proveedores de tus productos
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition text-sm md:text-base"
        >
          + Agregar Proveedor
        </button>
      </div>

      {/* Lista de Proveedores */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-500">Cargando proveedores...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">No hay proveedores</h3>
            <p className="text-gray-500 mb-4">Agrega tu primer proveedor para comenzar</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Agregar Proveedor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="h-12 px-4 md:px-6 text-left text-xs md:text-sm font-semibold text-gray-600">
                    Nombre
                  </th>
                  <th className="h-12 px-4 md:px-6 text-left text-xs md:text-sm font-semibold text-gray-600">
                    Productos asociados
                  </th>
                  <th className="h-12 px-4 md:px-6 text-right text-xs md:text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="p-4 align-middle">
                      <span className="text-sm md:text-base font-medium text-gray-900">
                        {provider.name}
                      </span>
                    </td>
                     <td className="p-4 align-middle text-gray-600 text-sm">
                       {/* Contar productos de este proveedor */}
                       <ProviderProductCount 
                         providerId={provider.id} 
                         onOpenModal={setSelectedProviderForModal} 
                       />
                     </td>
                    <td className="p-4 align-middle text-right space-x-2">
                      <button
                        onClick={() => handleEdit(provider)}
                        className="px-2 md:px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-3">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(provider.id)}
                        className="px-2 md:px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Proveedor */}
      <ProviderForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={() => {
          setShowForm(false);
          fetchProviders().catch(() => {});
        }}
        editingProvider={editingProvider}
      />

      {/* Confirmación de eliminar */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-bold mb-2">¿Eliminar proveedor?</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Esto no eliminará los productos asociados, pero quedarán sin proveedor.
              </p>
               <div className="flex gap-3">
                 <button
                   onClick={() => setDeleteConfirm(null)}
                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={() => handleDelete(deleteConfirm)}
                   className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                 >
                   Eliminar
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Modal de Productos del Proveedor */}
      <ProviderProductsModal
        providerId={selectedProviderForModal}
        onClose={() => setSelectedProviderForModal(null)}
      />
    </div>
  );
}

// Componente para contar productos de un proveedor (evita re-renders innecesarios)
function ProviderProductCount({ providerId, onOpenModal }: { providerId: number; onOpenModal: (id: number) => void }) {
  const { products } = useProductStore();
  const count = products.filter((p) => p.providerId === providerId).length;
  return (
    <button
      onClick={() => onOpenModal(providerId)}
      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
      title="Ver productos de este proveedor"
    >
      {count} producto(s)
    </button>
  );
}
