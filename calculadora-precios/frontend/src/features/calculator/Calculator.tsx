import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface Results {
  priceWithoutVAT: number;
  priceWithVAT: number;
  utility: number;
  marginUsed: number;
}

export function Calculator() {
  const [formData, setFormData] = useState({
    cost: '',
    profitPercentage: '',
    exemptFromVAT: false,
  } as const);

  const [results, setResults] = useState<Results | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    let priceWithoutVAT: number;
    if (divisor <= 0) {
      priceWithoutVAT = cost;
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
              <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Costo (Bs)</label>
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
              <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1.5">% de Ganancia</label>
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
            <span className="text-sm text-ink-2">Producto exento de IVA</span>
          </div>

          <Button
            onClick={calculate}
            className="w-full"
          >
            Calcular Precio
          </Button>

          {results && (
            <div className="mt-5 rounded-lg border border-line overflow-hidden">
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
                <div className="p-4 bg-price-subtle">
                  <span className="text-xs font-semibold text-ink-4 uppercase tracking-wider block mb-1">Precio sin IVA</span>
                  <p className="text-2xl font-bold text-ink font-mono num">{results.priceWithoutVAT} <span className="text-base font-medium text-ink-3">Bs</span></p>
                </div>
                <div className="p-4 bg-price-subtle border-t sm:border-t-0 border-line">
                  <span className="text-xs font-semibold text-ink-4 uppercase tracking-wider block mb-1">Precio con IVA</span>
                  <p className="text-2xl font-bold text-price font-mono num">{results.priceWithVAT} <span className="text-base font-medium text-price/70">Bs</span></p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line border-t border-line">
                <div className="p-4 bg-profit-subtle">
                  <span className="text-xs font-semibold text-ink-4 uppercase tracking-wider block mb-1">Utilidad</span>
                  <p className="text-2xl font-bold text-profit font-mono num">{results.utility} <span className="text-base font-medium text-profit/70">Bs</span></p>
                </div>
                <div className="p-4 bg-surface">
                  <span className="text-xs font-semibold text-ink-4 uppercase tracking-wider block mb-1">Margen usado</span>
                  <p className="text-2xl font-bold text-ink font-mono num">{results.marginUsed}<span className="text-base font-medium text-ink-3">%</span></p>
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
