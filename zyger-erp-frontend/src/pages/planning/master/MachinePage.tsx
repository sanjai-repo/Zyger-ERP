import MasterCrudPage from './MasterCrudPage';
export default function MachinePage() {
  return <MasterCrudPage title="Machines" subtitle="Define machines with capabilities and status tracking" apiMethod="getMachines" fields={[
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true },
    { key: 'machineType', label: 'Type' },
    { key: 'machineGroup', label: 'Group' },
    { key: 'workCenterCode', label: 'Work Center' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'hourlyRate', label: 'Hourly Rate', type: 'number' },
    { key: 'status', label: 'Status' },
    { key: 'maintenanceScheduleRef', label: 'Maintenance Ref' },
    { key: 'skillRequirement', label: 'Skill Required' },
    { key: 'programReference', label: 'Program Ref' },
  ]} />;
}
