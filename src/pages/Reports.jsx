import React from 'react';

export default function Reports() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-brand-navy">Reportes Holeshot</h2>
        <p className="mt-2 max-w-2xl text-slate-500">Resumen preparado para medir servicios, piezas, cotizaciones, entregas y seguimiento.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Servicios por categoria', 'Diagnostico, motor, frenos, suspension y mantenimiento.'],
          ['Piezas pendientes', 'Piezas ordenadas, recibidas, en stock o pendientes de suplidor.'],
          ['Cotizaciones', 'Solicitudes por cotizar, cotizadas, aprobadas o rechazadas.'],
          ['Entregas y pagos', 'Ordenes listas, balances pendientes y pagos recibidos.'],
        ].map(([title, description]) => (
          <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-brand-navy">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </article>
        ))}
      </section>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Los datos base ya estan en Supabase. La proxima mejora puede convertir estos bloques en reportes con numeros reales por fecha, vendedor, servicio y pieza.
      </div>
    </div>
  );
}



