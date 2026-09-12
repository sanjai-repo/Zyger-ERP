import MasterCrudPage from './MasterCrudPage';
export default function WorkCenterPage() {
  return <MasterCrudPage title="Work Centers" subtitle="Define work centers for production scheduling" apiMethod="getWorkCenters" fields={[
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true },
    { key: 'department', label: 'Department' },
    { key: 'machineGroup', label: 'Machine Group' },
    { key: 'defaultShift', label: 'Default Shift' },
    { key: 'capacityPerDay', label: 'Capacity/Day', type: 'number' },
    { key: 'efficiencyPct', label: 'Efficiency %', type: 'number' },
    { key: 'utilizationPct', label: 'Utilization %', type: 'number' },
    { key: 'hourlyRate', label: 'Hourly Rate', type: 'number' },
    { key: 'setupRate', label: 'Setup Rate', type: 'number' },
    { key: 'laborRate', label: 'Labor Rate', type: 'number' },
  ]} />;
}
