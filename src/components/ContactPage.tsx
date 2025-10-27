import React, { useState } from 'react';

interface ContactPageProps {
  onBack?: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent('Richiesta contatto Humotion');
    const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`);
    window.location.href = `mailto:info@humotion.ai?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-sky-100 bg-[url('/assets/humotion-bg.svg')] bg-cover bg-center">
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16">
        <div className="mb-8 flex flex-col items-center justify-center text-center min-h-[160px]">
          <img src="/assets/humotionlogin.png" alt="Humotion" className="mx-auto h-24 md:h-32" />
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900">Contattaci</h1>
          <p className="mt-3 text-gray-700">Hai domande su Humotion? Scrivici e ti risponderemo al più presto.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="Il tuo nome"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="tuo@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue min-h-[140px]"
                placeholder="Come possiamo aiutarti?"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center rounded-md px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Invia
              </button>
              <a
                href="mailto:info@humotion.ai"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md px-6 py-3 border border-brand-blue text-brand-blue font-semibold hover:bg-sky-50"
              >
                Scrivi via email
              </a>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md px-6 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Torna al login
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
