// config.js — Configuración de Nicolas Fabian
// Edita este archivo para personalizar la app.

const SHOP = {
  nombre:      "Nicolas Fabian",
  nombreCorto: "Nicolas",
  slogan:      "Tu barbero de confianza",
  logo:        "logo-fb.svg",         // iniciales FB como placeholder
  direccion:   "",
  horario:     "Lun a Sáb 10:00 – 20:00 hrs.",
  telefono:    "56XXXXXXXXX",         // reemplaza con el número real sin +
  club:        "",                    // sin club de fidelización

  barberos: [
    {
      id:           1,
      nombre:       "Nicolas Fabian",
      especialidad: "Barbero profesional",
      foto:         "foto-barbero.jpg",
      disponible:   true
    }
  ],

  modulos: {
    fidelizacion: false,
    lookbook:     false,
  },

  horario_config: {
    inicio:      10,
    fin:         20,
    diasHabiles: [1, 2, 3, 4, 5, 6]
  },

  servicios: []
};
