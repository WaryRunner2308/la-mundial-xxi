import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

export function Calculator() {
  const [formData, setFormData] = useState({
    cost: '',
    profitPercentage: '',
    exemptFromVAT: false,
  });

  const [results, setResults] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear results when input changes
    setResults(null);
  };

  const calculate = () => {
    if (!formData.cost || !formData.profitPercentage) {
      alert('Por favor ingrese el costo y el porcentaje de ganancia');
      return;
    }

    const cost = parseFloat(formData.cost);
    const profitPercentage = parseFloat(formData.profitPercentage);
    const exemptFromVAT = formData.exemptFromVAT;

    // Formula: priceWithoutVAT = cost / (1 - profitPercentage/100)
    const profitFactor = profitPercentage / 100;
    const divisor = 1 - profitFactor;
    let priceWithoutVAT;
    if (divisor <= 0) {
      priceWithoutVAT = cost; // fallback to avoid division by zero or negative
    } else {
      priceWithoutVAT = cost / divisor;
    }

    // Calculate utility
    const utility = priceWithoutVAT - cost;

    // Calculate price with VAT (if not exempt)
    const priceWithVAT = exemptFromVAT ? priceWithoutVAT : priceWithoutVAT * 1.16;

    setResults({
      priceWithoutVAT: parseFloat(priceWithoutVAT.toFixed(2)),
      priceWithVAT: parseFloat(priceWithVAT.toFixed(2)),
      utility: parseFloat(utility.toFixed(2)),
      marginUsed: profitPercentage,
    });
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Calculadora de Precios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Costo (Bs)</label>
              <Input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                placeholder="Ingrese el costo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">% de Ganancia</label>
              <Input
                type="number"
                name="profitPercentage"
                value={formData.profitPercentage}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="Ej: 20 para 20%"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              name="exemptFromVAT"
              checked={formData.exemptFromVAT}
              onChange={handleChange}
            />
            <span className="text-sm">Producto exento de IVA</span>
          </div>

          <Button
            onClick={calculate}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Calcular Precio
          </Button>

          {results && (
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <h3 className="text-lg font-semibold mb-4">Resultados</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Precio sin IVA:</span>
                  <p className="text-xl font-bold">{results.priceWithoutVAT} Bs</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Precio con IVA:</span>
                  <p className="text-xl font-bold">{results.priceWithVAT} Bs</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Utilidad:</span>
                  <p className="text-xl font-bold">{results.utility} Bs</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Margen usado:</span>
                  <p className="text-xl font-bold">{results.marginUsed}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default Calculator;