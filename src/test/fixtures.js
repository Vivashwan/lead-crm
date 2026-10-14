export const makeLead = (overrides = {}) => ({
  id: 'lead-1',
  name: 'Asha Rao',
  email: 'asha@acme.com',
  mobile: '9876543210',
  status: 'NEW',
  priority: 'HIGH',
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

export const sampleLeads = [
  makeLead({ id: 'a', name: 'Asha Rao', email: 'asha@acme.com', mobile: '9876543210', status: 'NEW', priority: 'HIGH', createdAt: 300 }),
  makeLead({ id: 'b', name: 'Bharat Singh', email: 'bharat@zen.io', mobile: '9123456789', status: 'WON', priority: 'LOW', createdAt: 100 }),
  makeLead({ id: 'c', name: 'Chen Li', email: 'chen@acme.com', mobile: '7700900123', status: 'NEW', priority: 'URGENT', createdAt: 200 }),
  makeLead({ id: 'd', name: 'Dana Fox', email: 'dana@fox.dev', mobile: '5551234567', status: 'PROPOSAL', priority: 'MEDIUM', createdAt: 400 }),
];
