'use client';

import { useState } from 'react';

type Bed = {
  id: number;
  roomNumber: string;
  type: string;
  status: 'available' | 'occupied' | 'maintenance';
  patient?: string;
  admissionDate?: string;
  expectedDischargeDate?: string;
};

export default function BedsManagement() {
  // Mock data for beds
  const [beds, setBeds] = useState<Bed[]>([
    { id: 1, roomNumber: '101-A', type: 'Individual', status: 'available' },
    { id: 2, roomNumber: '101-B', type: 'Individual', status: 'occupied', patient: 'Juan Pérez', admissionDate: '10/04/2025', expectedDischargeDate: '15/04/2025' },
    { id: 3, roomNumber: '102-A', type: 'Individual', status: 'available' },
    { id: 4, roomNumber: '102-B', type: 'Individual', status: 'maintenance' },
    { id: 5, roomNumber: '103-A', type: 'Doble', status: 'occupied', patient: 'María López', admissionDate: '08/04/2025', expectedDischargeDate: '18/04/2025' },
    { id: 6, roomNumber: '103-B', type: 'Doble', status: 'available' },
    { id: 7, roomNumber: '104-A', type: 'UCI', status: 'occupied', patient: 'Carlos Ruiz', admissionDate: '11/04/2025', expectedDischargeDate: '20/04/2025' },
    { id: 8, roomNumber: '104-B', type: 'UCI', status: 'available' },
    { id: 9, roomNumber: '105-A', type: 'Individual', status: 'occupied', patient: 'Ana García', admissionDate: '09/04/2025', expectedDischargeDate: '14/04/2025' },
    { id: 10, roomNumber: '105-B', type: 'Individual', status: 'available' },
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar las camas según el estado seleccionado y el término de búsqueda
  const filteredBeds = beds.filter(bed => {
    const matchesFilter = filter === 'all' || bed.status === filter;
    const matchesSearch = bed.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (bed.patient && bed.patient.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Función para actualizar el estado de una cama
  const updateBedStatus = (id: number, newStatus: 'available' | 'occupied' | 'maintenance') => {
    setBeds(beds.map(bed => 
      bed.id === id 
        ? { 
            ...bed, 
            status: newStatus,
            // Si el estado es "available", eliminar los datos del paciente
            ...(newStatus === 'available' && { 
              patient: undefined, 
              admissionDate: undefined, 
              expectedDischargeDate: undefined 
            })
          } 
        : bed
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Camas</h2>
        <button className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 bg-pantone-314c hover:bg-pantone-313u text-white font-medium rounded-md shadow-sm">
          <span className="mr-2">+</span>
          Nueva Cama
        </button>
      </div>
      
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Buscar por habitación o paciente..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pantone-311c"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            className={`px-3 py-2 rounded-md ${filter === 'all' ? 'bg-pantone-311u text-pantone-314c' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setFilter('all')}
          >
            Todas
          </button>
          <button 
            className={`px-3 py-2 rounded-md ${filter === 'available' ? 'bg-pantone-311u text-pantone-314c' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setFilter('available')}
          >
            Disponibles
          </button>
          <button 
            className={`px-3 py-2 rounded-md ${filter === 'occupied' ? 'bg-pantone-311u text-pantone-314c' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setFilter('occupied')}
          >
            Ocupadas
          </button>
          <button 
            className={`px-3 py-2 rounded-md ${filter === 'maintenance' ? 'bg-pantone-311u text-pantone-314c' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setFilter('maintenance')}
          >
            Mantenimiento
          </button>
        </div>
      </div>
      
      {/* Tabla de camas */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Habitación
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paciente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Ingreso
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alta Prevista
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBeds.map((bed) => (
              <tr key={bed.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {bed.roomNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {bed.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    bed.status === 'available' ? 'bg-green-100 text-green-800' :
                    bed.status === 'occupied' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {bed.status === 'available' ? 'Disponible' :
                     bed.status === 'occupied' ? 'Ocupada' : 'Mantenimiento'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {bed.patient || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {bed.admissionDate || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {bed.expectedDischargeDate || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {bed.status !== 'occupied' && (
                      <button className="text-pantone-313u hover:text-pantone-314c"
                              onClick={() => alert(`Asignar paciente a cama ${bed.roomNumber}`)}>
                        <span className="sr-only">Asignar</span>
                        <span className="text-lg">👤</span>
                      </button>
                    )}
                    
                    {bed.status === 'occupied' && (
                      <button className="text-green-600 hover:text-green-800"
                              onClick={() => updateBedStatus(bed.id, 'available')}>
                        <span className="sr-only">Alta</span>
                        <span className="text-lg">✓</span>
                      </button>
                    )}
                    
                    {bed.status !== 'maintenance' ? (
                      <button className="text-yellow-600 hover:text-yellow-800"
                              onClick={() => updateBedStatus(bed.id, 'maintenance')}>
                        <span className="sr-only">Mantenimiento</span>
                        <span className="text-lg">🔧</span>
                      </button>
                    ) : (
                      <button className="text-green-600 hover:text-green-800"
                              onClick={() => updateBedStatus(bed.id, 'available')}>
                        <span className="sr-only">Disponible</span>
                        <span className="text-lg">✓</span>
                      </button>
                    )}
                    
                    <button className="text-pantone-314c hover:text-pantone-313u">
                      <span className="sr-only">Editar</span>
                      <span className="text-lg">✏️</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredBeds.length === 0 && (
        <div className="bg-white p-6 text-center rounded-lg shadow">
          <p className="text-gray-500">No se encontraron camas que coincidan con los criterios de búsqueda</p>
        </div>
      )}
    </div>
  );
}
