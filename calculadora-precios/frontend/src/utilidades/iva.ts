/**
 * Tasa del IVA, en un solo lugar.
 *
 * Antes el 16% estaba escrito a mano como `* 1.16` en cuatro pantallas
 * distintas (lista de productos, formulario, calculadora y modal de
 * proveedor) y además como constante aparte en el cálculo de facturas. Si el
 * IVA cambiara, había que acordarse de los cinco sitios, y el que se olvidara
 * mostraría un precio distinto al de las otras pantallas para el mismo
 * producto.
 */

/** Tasa vigente del IVA en Venezuela (16%). */
export const IVA = 0.16;

/** Multiplicador para agregarle el IVA a un precio base. */
export const FACTOR_IVA = 1 + IVA;

/** Porcentaje del IVA tal como se muestra en pantalla ("16%"). */
export const IVA_PORCENTAJE = `${Math.round(IVA * 100)}%`;
