// ============================================
// 🔍 SCRIPT DE DIAGNÓSTICO DE SUPABASE
// Pégalo en la consola del navegador (F12)
// ============================================

(async () => {
  console.log('🔎 === Diagnóstico Supabase ===');

  // 1. Verificar variables de entorno
  console.log('1. Variables de entorno:');
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  console.log('   URL:', url || '❌ NO DEFINIDA');
  console.log('   KEY:', key ? '✅ Definida' : '❌ NO DEFINIDA');

  if (!url || !key) {
    console.error('❌ ERROR: Variables de entorno no cargadas. Verifica .env');
    return;
  }

  // 2. Probar conexión con Supabase
  console.log('2. Probando conexión...');
  try {
    // Acceder al cliente supabase desde el store
    const { supabase } = await import('/src/lib/supabase.ts');

    // Hacer una consulta simple
    const { data, error } = await supabase.from('products').select('count').limit(1);

    if (error) {
      console.error('❌ Error en consulta:', error);
      console.error('   Código:', error.code);
      console.error('   Mensaje:', error.message);
      console.error('   Detalles:', error.details);
      console.error('\n🔧 Solución común: En Supabase → Table Editor → products → Policies → Elimina las políticas RLS o añade una que permita INSERT público');
    } else {
      console.log('✅ Conexión exitosa. Tabla "products" accesible.');
    }

    // 3. Probar inserción de prueba
    console.log('3. Probando inserción de prueba...');
    const testData = {
      name: 'Producto Test ' + Date.now(),
      category: '',
      cost_usd: 10.5,
      original_currency: 'Bs' as const,
      profit_percentage: 20,
      exempt_from_vat: false,
      photo_url: null
    };

    const { data: insertData, error: insertError } = await supabase
      .from('products')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error al insertar:', insertError);
      console.error('   ¿RLS activo? Ve a Supabase → Authentication → Policies');
      console.error('   ¿Columnas incorrectas? Verifica que la tabla tenga exactamente: cost_usd, original_currency, profit_percentage, exempt_from_vat, photo_url');
    } else {
      console.log('✅ Producto de prueba insertado:', insertData);
      // Limpiar
      await supabase.from('products').delete().eq('id', insertData.id);
      console.log('✅ Producto de prueba eliminado');
    }

  } catch (err: any) {
    console.error('❌ Error inesperado:', err);
  }

  console.log('🔚 === Fin del diagnóstico ===');
})();
