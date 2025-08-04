'use client';
import React from 'react';

export default function HomePage() {
  return (
    <main className="bg-white text-gray-800">
      {/* Sezione 1 - Ikigai */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-20 bg-gradient-to-b from-white to-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-x-24 items-center">

          {/* Colonna Sinistra: Testo */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Il tuo Ikigai. Il tuo Futuro.
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700">
              Il concetto giapponese di <strong>Ikigai</strong> rappresenta “ciò che dà senso alla vita”.
              Il nostro progetto si fonda su questo principio, con l’obiettivo di aiutarti a trovare
              non solo una carriera, ma un percorso professionale significativo, costruito intorno a
              <strong> valori, passioni e realizzazione personale</strong>.
            </p>
          </div>

          {/* Colonna Destra: Immagine */}
          <div className="flex justify-center">
            <img
              src="/images/ikigai1.png" // Sostituisci con il tuo path
              alt="Ikigai Visual"
              className="w-full max-w-md md:max-w-lg lg:max-w-xl object-contain rounded-2xl "
            />
          </div>
        </div>
      </section>

      {/* Sezione 2 - Funzionalità */}
      <section
        className="bg-white py-20 px-6 md:px-12 lg:px-24 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
            Come funziona la nostra applicazione
          </h2>

          {/* Blocco Career Match */}
          <div className="mb-20">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Career Match</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Esistono due percorsi possibili:
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Percorso semplificato</h4>
                <p className="text-gray-700 leading-relaxed">
                  L’utente fornisce solo una parte delle proprie informazioni, come competenze, interessi, percorso accademico o semplicemente il proprio CV.
                  In questo caso, si passa direttamente alla fase successiva, “Career Coach”, ma con una personalizzazione meno accurata.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Percorso completo</h4>
                <p className="text-gray-700 leading-relaxed">
                  L’utente inserisce tutti i dati richiesti, compresi quelli relativi alla propria personalità (valutata attraverso strumenti come il test dei Big Five o altri test open source simili).
                  Questo approccio consente una profilazione più precisa e un supporto più efficace nella fase successiva.
                </p>
              </div>
            </div>
          </div>

          {/* Blocco Career Coach */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Career Coach</h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Orientamento agli obiettivi</h4>
                <p className="text-gray-700 leading-relaxed">
                  Supporto pratico nel definire traguardi realistici e stimolanti, dal primo colloquio fino al consolidamento della carriera.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Pianificazione strategica</h4>
                <p className="text-gray-700 leading-relaxed">
                  Suggerimenti e strumenti per organizzare i passi necessari al raggiungimento degli obiettivi, con aggiornamenti progressivi.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Crescita personale e professionale</h4>
                <p className="text-gray-700 leading-relaxed">
                  Accompagnamento continuo per sviluppare competenze, migliorare la motivazione e mantenere l’allineamento con i valori profondi dell’utente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
