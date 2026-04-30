import React from 'react';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Nuevo Producto
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-100">
            Calculadora
          </button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Total de Productos</h2>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Últimos Productos</h2>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">No hay productos registrados</div>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Estadísticas Rápidas</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Ganancia Promedio:</span>
              <span className="font-medium">0%</span>
            </div>
            <div className="flex justify-between">
              <span>Precio Medio:</span>
              <span className="font-medium">0 Bs</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}