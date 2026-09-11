import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, X } from 'lucide-react';
import { useAlmacenProveedores } from '../../almacen/almacenProveedores';
import { CampoSeguro } from '@/componentes/ui/CampoSeguro';

interface PropsFormularioProveedor {
  estaAbierto: boolean;
  alCerrar: () => void;
  alGuardar?: () => void;
  proveedorEnEdicion?: { id: number; name: string } | null;
}

export function FormularioProveedor({ estaAbierto, alCerrar, alGuardar, proveedorEnEdicion }: PropsFormularioProveedor) {
  const { agregarProveedor, actualizarProveedor } = useAlmacenProveedores();
  const [nombre, fijarNombre] = useState('');
  const [error, fijarError] = useState<string | null>(null);
  const [cargando, fijarCargando] = useState(false);

  useEffect(() => {
    if (proveedorEnEdicion) {
      fijarNombre(proveedorEnEdicion.name);
    } else {
      fijarNombre('');
    }
    fijarError(null);
  }, [proveedorEnEdicion, estaAbierto]);

  const alEnviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nombre.trim()) {
      fijarError('El nombre es requerido');
      return;
    }

    fijarCargando(true);
    fijarError(null);

    try {
      if (proveedorEnEdicion) {
        await actualizarProveedor(proveedorEnEdicion.id, nombre.trim());
      } else {
        await agregarProveedor(nombre.trim());
      }
      alGuardar?.();
      alCerrar();
    } catch (err) {
      fijarError(err instanceof Error ? err.message : 'Error al guardar proveedor');
    } finally {
      fijarCargando(false);
    }
  };

  return (
    <AnimatePresence>
      {estaAbierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={alCerrar}
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="max-w-md w-full rounded-2xl p-6 md:p-8"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Strip Portugal */}
            <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
              <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
              <div style={{ flex: 3, background: '#C8102E' }} />
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.2)' }}>
                  <Truck size={20} style={{ color: '#009A3A' }} />
                </div>
                <div>
                  <h2 className="font-black text-[#e6edf3] uppercase tracking-wide leading-none"
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                    {proveedorEnEdicion ? 'Editar Proveedor' : 'Agregar Proveedor'}
                  </h2>
                  <p className="text-sm text-[#8b949e] mt-1.5">
                    {proveedorEnEdicion ? 'Modifica el nombre del proveedor' : 'Registra un nuevo proveedor para tus productos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={alCerrar}
                className="p-2 rounded-xl transition flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={alEnviar} className="space-y-4" autoComplete="off" noValidate>
              <div>
                <CampoSeguro
                  etiqueta="Nombre del Proveedor *"
                  value={nombre}
                  onChange={(v) => { fijarNombre(v); fijarError(null); }}
                  alEnviar={alEnviar}
                  placeholder="Ej: Polar, Coca-Cola, Luventa"
                  inputMode="text"
                  editable
                  sinAnillo
                  className="[&_label]:text-xs [&_label]:font-black [&_label]:text-[#009A3A] [&_label]:uppercase [&_label]:tracking-wider"
                  claseTextoVisible="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
                  enfocarAlMontar
                />
                {error && (
                  <div className="mt-2 p-3 rounded-xl text-sm flex items-center gap-2 text-[#C8102E]"
                    style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={alCerrar}
                  disabled={cargando}
                  className="flex-1 px-5 py-3 rounded-xl text-[#8b949e] font-semibold hover:text-[#e6edf3] transition text-sm disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando || !nombre.trim()}
                  className="flex-1 px-5 py-3 text-white font-bold rounded-xl transition text-sm disabled:opacity-50"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                    boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                  }}
                >
                  {cargando ? 'Guardando...' : (proveedorEnEdicion ? 'ACTUALIZAR' : 'AGREGAR')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
