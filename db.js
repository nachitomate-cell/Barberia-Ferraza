// db.js - Persistencia y Lógica de Negocio
const defaultSettings = {
    horarioInicio: "09:00",
    horarioFin: "20:00",
    intervaloMinutos: 30,
    diasLaborales: [1, 2, 3, 4, 5, 6], // Lun a Sab
    telefonoAdmin: "56900000000" // WhatsApp Receptor
};

const defaultServices = [
    { id: 1, nombre: "Corte Clásico", precio: 15000, duracion: 60 },
    { id: 2, nombre: "Barba Premium", precio: 10000, duracion: 30 },
    { id: 3, nombre: "Corte + Barba", precio: 22000, duracion: 90 },
    { id: 4, nombre: "Perfilado Cejas", precio: 5000, duracion: 30 }
];


// Inicialización Robusta de Storage
function initDatabase() {
    // Settings: Combinar existentes con defaults para asegurar que no falten llaves (como intervaloMinutos)
    const currentSettings = JSON.parse(localStorage.getItem('barber_settings') || '{}');
    
    // Forzamos el nuevo horario para que aplique incluso si había caché local preexistente
    currentSettings.horarioInicio = "09:00";
    currentSettings.horarioFin = "20:00";

    localStorage.setItem('barber_settings', JSON.stringify({ ...defaultSettings, ...currentSettings }));

    // Servicios: Solo inicializar si no existen
    if (!localStorage.getItem('barber_services')) {
        localStorage.setItem('barber_services', JSON.stringify(defaultServices));
    }

    // Reservas: Solo inicializar si no existen
    if (!localStorage.getItem('barber_bookings')) {
        localStorage.setItem('barber_bookings', JSON.stringify([]));
    }
}
initDatabase();


const DB = {
    getSettings: () => JSON.parse(localStorage.getItem('barber_settings')),
    
    updateSettings: (newSet) => {
        const cs = DB.getSettings();
        localStorage.setItem('barber_settings', JSON.stringify({...cs, ...newSet}));
    },

    getServices: () => JSON.parse(localStorage.getItem('barber_services')),
    
    addService: (srv) => {
        const s = DB.getServices();
        srv.id = Date.now();
        s.push(srv);
        localStorage.setItem('barber_services', JSON.stringify(s));
    },

    deleteService: (id) => {
        const s = DB.getServices().filter(x => String(x.id) !== String(id));
        localStorage.setItem('barber_services', JSON.stringify(s));
    },

    getBookings: () => JSON.parse(localStorage.getItem('barber_bookings') || '[]'),
    
    saveBooking: (booking) => {
        const bookings = DB.getBookings();
        booking.id = Date.now().toString(); 
        booking.estado = "Confirmado";
        booking.creadoEn = new Date().toISOString();
        bookings.push(booking);
        localStorage.setItem('barber_bookings', JSON.stringify(bookings));
        return booking;
    },

    updateBookingStatus: (id, status) => {
        const bookings = DB.getBookings();
        const index = bookings.findIndex(b => String(b.id) === String(id));
        if (index > -1) {
            bookings[index].estado = status;
            localStorage.setItem('barber_bookings', JSON.stringify(bookings));
        }
    },

    updateBookingNote: (bookingId, noteText) => {
        const bookings = DB.getBookings();
        const index = bookings.findIndex(b => String(b.id) === String(bookingId));
        if (index > -1) {
            bookings[index].nota = noteText;
            localStorage.setItem('barber_bookings', JSON.stringify(bookings));
        }
    },

    getMonthlyRevenue: () => {
        const bookings = DB.getBookings();
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
        
        let totalRev = 0;
        let count = 0;
        const allServices = DB.getServices();
        
        bookings.forEach(b => {
            if (b.estado === "Confirmado" && b.fecha.startsWith(currentYearMonth)) {
                count++;
                const srv = allServices.find(s => s.nombre === b.servicioNombre);
                if (srv) totalRev += srv.precio;
            }
        });
        
        return { total: totalRev, count: count };
    },
    
    getAvailableHours: (dateStr, newServiceDuration) => {
        const settings = DB.getSettings();
        const interval = parseInt(settings.intervaloMinutos) || 30;
        const bookings = DB.getBookings().filter(b => b.fecha === dateStr && b.estado === "Confirmado");
        
        const timeToMins = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
        const minsToTime = (m) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
        
        const bStartMins = timeToMins(settings.horarioInicio);
        const bEndMins = timeToMins(settings.horarioFin);
        
        // Mapear bloques ocupados basándose en la duración de cada cita existente
        let ocupados = bookings.map(b => ({
            start: timeToMins(b.hora),
            end: timeToMins(b.hora) + parseInt(b.duracionServicio)
        }));

        let available = [];
        let currMins = bStartMins;
        
        while (currMins + parseInt(newServiceDuration) <= bEndMins) {
            // Un bloque está ocupado si el servicio solicitado solapa con CUALQUIER cita existente
            let isOccupied = ocupados.some(o => {
                return (currMins < o.end) && ((currMins + parseInt(newServiceDuration)) > o.start);
            });
            
            available.push({
                time: minsToTime(currMins),
                occupied: isOccupied
            });
            
            currMins += interval;
        }
        return available;
    }
};
