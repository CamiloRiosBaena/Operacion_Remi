import React, { useEffect } from 'react';
import './RemiLandingPage.css';
import { useNavigate } from 'react-router-dom';

interface Testimonial {
  initials: string;
  name: string;
  location: string;
  quote: string;
  stars: number;
}

interface Feature {
  iconBg: string;
  icon: string;
  title: string;
  desc: string;
}

interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  style?: React.CSSProperties;
}

const testimonials: Testimonial[] = [
  {
    initials: 'CA',
    name: 'Carlos Arango',
    location: 'Bogotá, CO',
    quote: 'La calidad de la comida es increíble. En menos de 10 minutos tenía mi plato listo y el sabor superó todas mis expectativas. ¡Remi es el futuro!',
    stars: 5,
  },
  {
    initials: 'LM',
    name: 'Laura Medina',
    location: 'Medellín, CO',
    quote: 'Me encanta que usen ingredientes orgánicos locales. Se nota la diferencia en el sabor y además me siento bien sabiendo que apoya a productores de la región.',
    stars: 5,
  },
  {
    initials: 'JT',
    name: 'Javier Torres',
    location: 'Cali, CO',
    quote: 'El bowl mediterráneo es simplemente espectacular. Los precios son justos para la calidad que ofrecen. Ya es mi lugar favorito para almorzar.',
    stars: 5,
  },
];

function useFadeInUp(): void {
  useEffect(() => {
    const els = document.querySelectorAll<Element>('.fade-in-up');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.15 }
    );

    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

const Icon: React.FC<IconProps> = ({ name, filled = false, size = 24, style = {} }) => (
  <span
    className="material-symbols-outlined"
    style={{
      fontSize: size,
      fontVariationSettings: filled
        ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      ...style,
    }}
  >
    {name}
  </span>
);

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <nav className="navbar__inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#" className="navbar__logo">
            <Icon name="restaurant_menu" filled />
            Remi
          </a>

          <ul className="navbar__links">
            <li><a href="#como-funciona">Cómo Funciona</a></li>
            <li><a href="#filosofia">Filosofía</a></li>
            <li><a href="#ubicaciones">Ubicaciones</a></li>
            <li><a href="#nosotros">Nosotros</a></li>
          </ul>
        </div>

        <div className="navbar__actions">
          <button className="btn-ghost" onClick={() => navigate('/login')}>
            Iniciar Sesión
          </button>

          <button className="btn-primary" onClick={() => navigate('/menu')}>
            Haz tu pedido
          </button>
        </div>
      </nav>
    </header>
  );
};

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero__bg">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsw_4RRhb-K8gd_KK54r8I93fJ5ZGZG0LcSW4Fr1phQxNVD63PYV6wMdKWSpxgHsmohSdkQ051SZ22TEjW5d1O3VZSEiuiMzSdhnP27tXelmbd0gAibi_-bJ3BwxODFEJcFwHGtjXJKaGFk080UzcmjBDLWGU6-zeWw9Hr8a4kVLslAmSUj-JhiH-VH29eE7kvS6b9VIfUkq90S3L-N7ZJ2t3d-zUwZEb8ZrNYWkh2xT2g4kmUzBFuhuvWV99jx75-jaaQPqHVkC0"
          alt="Steak premium sobre mesa rústica oscura"
        />
        <div className="hero__bg-overlay hero-gradient" />
      </div>

      <div className="hero__content">
        <div className="hero__text-block fade-in-up">
          <span className="hero__badge">Sabor Inigualable</span>

          <h1 className="hero__title">
            La Revolución del <br />
            <span>Sabor Premium</span>
          </h1>

          <p className="hero__subtitle">
            Descubre una experiencia culinaria donde la automatización de alta gama
            se encuentra con la pasión de la cocina tradicional. Frescura, rapidez
            y exclusividad en cada bocado.
          </p>

          <div className="hero__cta-group">
            <button className="btn-hero-primary" onClick={() => navigate('/menu')}>
              Explorar Menú
              <Icon name="arrow_forward" />
            </button>

            <button
              className="btn-hero-secondary"
              onClick={() => {
                const el = document.getElementById('ubicaciones');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ver Ubicaciones
            </button>
          </div>
        </div>

        <div className="hero__image-card glass-card fade-in-up">
          <div className="hero__rating">
            <span className="hero__rating-score">4.9</span>
            <span className="hero__rating-label">Estrellas</span>
          </div>

          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPf-Z8ZvGkfu0Sg-o9wHjUqvGw_Jw0MZeSsHCoW4GLEAxTlbV3fQJyCddgpH6EODIa4m7NbvHAoe2tE4qvXRB2IaiQFStb-t5ni98xJ_T47VgP9oQctbYc_GhKVPD9fr_n4hCKbub523--ywPePOrgrdDKPVUUpJ8Ldfw2nbjF9b0nhWFN98WA_WS_wLjAqtEVMG1Vt0HHgHkQA5AGXd6fHLwj52NYd8pYw13sn954DVv1bfeRqloUbu_j8OHsPEjvVMnHvNeoJj0"
            alt="Composición gourmet de platos premium"
          />
        </div>
      </div>
    </section>
  );
};

const ExperienceSection: React.FC = () => {
  const features: Feature[] = [
    {
      iconBg: 'bg-secondary-container',
      icon: 'speed',
      title: 'Rapidez Extrema',
      desc: 'Tu pedido listo en minutos gracias a una cocina automatizada que conserva textura, temperatura y sabor.',
    },
    {
      iconBg: 'bg-primary-fixed',
      icon: 'eco',
      title: 'Ingredientes Reales',
      desc: 'Trabajamos con productos frescos, locales y trazables para que cada plato tenga origen y carácter.',
    },
    {
      iconBg: 'bg-secondary-fixed',
      icon: 'workspace_premium',
      title: 'Calidad Premium',
      desc: 'Recetas diseñadas por chefs, medidas con precisión y servidas con una experiencia consistente.',
    },
  ];

  return (
    <section id="como-funciona" className="experience-section">
      <div className="experience">
        <div className="section-header fade-in-up">
          <span className="section-eyebrow">Cómo funciona</span>
          <h2 className="section-title">Alta cocina, servida con precisión.</h2>
          <p className="section-subtitle">
            Remi combina tecnología, ingredientes seleccionados y criterio culinario
            para entregar platos rápidos sin sentirse industriales.
          </p>
        </div>

        <div className="experience__grid">
          {features.map((f: Feature, index: number) => (
            <div className="feature-card fade-in-up" key={f.title}>
              <span className="feature-card__number">0{index + 1}</span>

              <div className={`feature-card__icon ${f.iconBg}`}>
                <Icon name={f.icon} filled />
              </div>

              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="experience__stats fade-in-up">
          <div>
            <strong>10 min</strong>
            <span>promedio por pedido</span>
          </div>

          <div>
            <strong>4.9</strong>
            <span>calificación promedio</span>
          </div>

          <div>
            <strong>100%</strong>
            <span>recetas curadas por chefs</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const PhilosophySection: React.FC = () => (
  <section id="filosofia" className="philosophy-section">
    <div className="philosophy-section__inner">
      <div className="philosophy__header fade-in-up">
        <span className="philosophy__eyebrow">Nuestra filosofía</span>

        <h2 className="philosophy__heading">
          Creemos en la <span>cocina honesta</span>
        </h2>

        <p className="philosophy__intro">
          Cada plato que preparamos nace de una convicción: la buena comida
          no necesita atajos, necesita intención.
        </p>
      </div>

      <blockquote className="philosophy__quote fade-in-up">
        <p className="philosophy__quote-text">
          "La automatización no reemplaza la pasión — la libera para que el
          chef pueda enfocarse en lo que realmente importa: el sabor."
        </p>

        <footer className="philosophy__quote-attr">
          — Equipo Remi, fundadores
        </footer>
      </blockquote>

      <div className="philosophy__pillars">
        {[
          {
            num: 'Pilar 01',
            title: 'Origen trazable',
            body: 'Sabemos de dónde viene cada ingrediente. Trabajamos con productores locales comprometidos con prácticas sostenibles y justas.',
          },
          {
            num: 'Pilar 02',
            title: 'Precisión sin frialdad',
            body: 'La tecnología nos da consistencia, pero la receta siempre la define un chef. Ciencia al servicio del gusto, nunca al revés.',
          },
          {
            num: 'Pilar 03',
            title: 'Placer sin culpa',
            body: 'Comer rico y comer bien no son opuestos. Cada menú está diseñado para nutrir el cuerpo tanto como el alma.',
          },
        ].map((p) => (
          <div className="philosophy__pillar fade-in-up" key={p.num}>
            <span className="philosophy__pillar-num">{p.num}</span>
            <h3 className="philosophy__pillar-title">{p.title}</h3>
            <p className="philosophy__pillar-body">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TestimonialsSection: React.FC = () => (
  <section id="ubicaciones" className="locations-section">
    <div className="locations">
      <div className="section-header fade-in-up">
        <span className="section-eyebrow">Ubicaciones y comunidad</span>
        <h2 className="section-title">Remi ya se está volviendo ritual.</h2>
        <p className="section-subtitle">
          Tres ciudades, miles de pedidos y una experiencia pensada para quienes
          quieren comer bien sin esperar de más.
        </p>
      </div>

      <div className="locations__grid fade-in-up">
        {[
          { city: 'Bogotá', zone: 'Chapinero · Zona T', icon: 'location_on' },
          { city: 'Medellín', zone: 'El Poblado · Provenza', icon: 'location_on' },
          { city: 'Cali', zone: 'Granada · Ciudad Jardín', icon: 'location_on' },
        ].map((location) => (
          <div className="location-card" key={location.city}>
            <Icon name={location.icon} filled />

            <div>
              <h3>{location.city}</h3>
              <p>{location.zone}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="testimonials">
        <div className="testimonials__header fade-in-up">
          <span className="section-eyebrow">Opiniones</span>
          <h2 className="testimonials__title">Lo que dicen nuestros clientes</h2>
          <p className="testimonials__subtitle">
            Más de 10,000 comensales satisfechos avalan la experiencia Remi.
          </p>
        </div>

        <div className="testimonials__grid">
          {testimonials.map((t: Testimonial) => (
            <div className="testimonial-card fade-in-up" key={t.name}>
              <div className="testimonial-card__stars">
                {Array.from({ length: t.stars }).map((_, i: number) => (
                  <Icon key={i} name="star" filled size={18} />
                ))}
              </div>

              <p className="testimonial-card__quote">"{t.quote}"</p>

              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">{t.initials}</div>

                <div>
                  <p className="testimonial-card__name">{t.name}</p>
                  <p className="testimonial-card__location">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const CtaBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="nosotros" className="cta-banner">
      <h2 className="cta-banner__title fade-in-up">
        ¿Listo para el primer bocado?
      </h2>

      <p className="cta-banner__subtitle fade-in-up">
        Haz tu primer pedido hoy y descubre por qué miles de personas ya eligieron Remi.
      </p>

      <button className="btn-cta fade-in-up" onClick={() => navigate('/menu')}>
        Hacer mi primer pedido
      </button>
    </section>
  );
};

const Footer: React.FC = () => (
  <footer className="footer">
    <div className="footer__inner">
      <div>
        <div className="footer__logo">
          <Icon
            name="restaurant_menu"
            filled
            size={28}
            style={{ color: 'var(--inverse-primary)' }}
          />
          Remi
        </div>

        <p className="footer__tagline">
          La revolución del sabor premium. Automatización, frescura y pasión
          culinaria en cada pedido.
        </p>
      </div>

      <div>
        <p className="footer__col-title">Empresa</p>
        <ul className="footer__links">
          <li><a href="#">Nosotros</a></li>
          <li><a href="#">Ubicaciones</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Carreras</a></li>
        </ul>
      </div>

      <div>
        <p className="footer__col-title">Menú</p>
        <ul className="footer__links">
          <li><a href="#">Desayunos</a></li>
          <li><a href="#">Almuerzos</a></li>
          <li><a href="#">Cenas</a></li>
          <li><a href="#">Especiales</a></li>
        </ul>
      </div>

      <div>
        <p className="footer__col-title">Soporte</p>
        <ul className="footer__links">
          <li><a href="#">Contacto</a></li>
          <li><a href="#">FAQ</a></li>
          <li><a href="#">Términos</a></li>
          <li><a href="#">Privacidad</a></li>
        </ul>
      </div>
    </div>

    <div className="footer__bottom">
      <p className="footer__copyright">
        © 2026 Remi. Todos los derechos reservados.
      </p>
      <p className="footer__copyright">Hecho con ❤️ en Colombia</p>
    </div>
  </footer>
);

const Remi: React.FC = () => {
  useFadeInUp();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ExperienceSection />
        <PhilosophySection />
        <TestimonialsSection />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
};

export default Remi;