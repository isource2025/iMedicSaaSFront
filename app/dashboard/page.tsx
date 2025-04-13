export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dashboard Cards */}
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pantone-313u">
          <h3 className="text-gray-500 text-sm">Total Camas</h3>
          <p className="text-2xl font-bold text-gray-800">45</p>
          <div className="text-xs mt-2">
            <span className="text-green-500 font-medium">32 Disponibles</span>
            <span className="mx-1">|</span>
            <span className="text-red-500 font-medium">13 Ocupadas</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pantone-311u">
          <h3 className="text-gray-500 text-sm">Pacientes</h3>
          <p className="text-2xl font-bold text-gray-800">126</p>
          <div className="text-xs mt-2">
            <span className="text-blue-500 font-medium">8 Ingresos hoy</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pantone-314c">
          <h3 className="text-gray-500 text-sm">Citas del Día</h3>
          <p className="text-2xl font-bold text-gray-800">28</p>
          <div className="text-xs mt-2">
            <span className="text-orange-500 font-medium">12 Pendientes</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pantone-311c">
          <h3 className="text-gray-500 text-sm">Personal Activo</h3>
          <p className="text-2xl font-bold text-gray-800">18</p>
          <div className="text-xs mt-2">
            <span className="text-purple-500 font-medium">3 Médicos de guardia</span>
          </div>
        </div>
      </div>
      
      {/* Activity Overview */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          {[
            { time: '09:45', action: 'Ingreso de paciente', details: 'Juan Pérez - Habitación 203', icon: '👤' },
            { time: '11:30', action: 'Alta médica', details: 'María Rodríguez - Habitación 108', icon: '🏥' },
            { time: '13:15', action: 'Cambio de cama', details: 'Roberto Gómez - De 305 a 310', icon: '🛏️' },
            { time: '14:20', action: 'Programación de cirugía', details: 'Ana Torres - Quirófano 2', icon: '🔪' },
          ].map((item, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 rounded-full bg-pantone-311u bg-opacity-20 flex items-center justify-center">
                  <span>{item.icon}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-800 font-medium">{item.action}</p>
                <p className="text-xs text-gray-500">{item.details}</p>
              </div>
              <div className="ml-auto text-xs text-gray-400">{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
