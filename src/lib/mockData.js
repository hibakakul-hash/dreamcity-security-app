// Mock data for demo mode (before Supabase is connected)
export const mockVisitors = [
  {
    id: 1,
    visitor_name: 'Ahmed Khan',
    vehicle_number: 'ABC-123',
    purpose: 'Guest',
    unit: 'A-201',
    resident_name: 'Sara Ali',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    approved_at: null,
  },
  {
    id: 2,
    visitor_name: 'Delivery - DHL',
    vehicle_number: 'DHL-456',
    purpose: 'Delivery',
    unit: 'B-105',
    resident_name: 'Usman Malik',
    status: 'approved',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    approved_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: 3,
    visitor_name: 'Fatima Sheikh',
    vehicle_number: '',
    purpose: 'Family',
    unit: 'C-302',
    resident_name: 'Bilal Sheikh',
    status: 'denied',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    approved_at: null,
  },
  {
    id: 4,
    visitor_name: 'Plumber - Ali Raza',
    vehicle_number: '',
    purpose: 'Service',
    unit: 'A-104',
    resident_name: 'Nadia Hussain',
    status: 'approved',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    approved_at: new Date(Date.now() - 2 * 3600000 + 60000).toISOString(),
  },
]

export const mockPreApprovals = [
  {
    id: 1,
    visitor_name: 'Ahmed Khan',
    purpose: 'Guest',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 24 * 3600000).toISOString(),
    unit: 'A-201',
    resident_name: 'Sara Ali',
    is_active: true,
  },
]

export const mockResidents = [
  { id: 1, name: 'Sara Ali', unit: 'A-201', phone: '0300-1234567' },
  { id: 2, name: 'Usman Malik', unit: 'B-105', phone: '0301-2345678' },
  { id: 3, name: 'Bilal Sheikh', unit: 'C-302', phone: '0302-3456789' },
  { id: 4, name: 'Nadia Hussain', unit: 'A-104', phone: '0303-4567890' },
  { id: 5, name: 'Kamran Iqbal', unit: 'D-401', phone: '0304-5678901' },
]
