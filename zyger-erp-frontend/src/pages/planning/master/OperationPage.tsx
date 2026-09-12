import MasterCrudPage from './MasterCrudPage';
export default function OperationPage() {
  return <MasterCrudPage title="Operations" subtitle="Standard operations with setup and cycle times" apiMethod="getOperations" fields={[
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'standardSetupTime', label: 'Setup Time (min)', type: 'number' },
    { key: 'standardCycleTime', label: 'Cycle Time (min)', type: 'number' },
    { key: 'operationType', label: 'Type' },
    { key: 'defaultWorkCenter', label: 'Default Work Center' },
    { key: 'inspectionRequired', label: 'Inspection Required' },
    { key: 'skillRequired', label: 'Skill Required' },
    { key: 'machineRequirement', label: 'Machine Requirement' },
    { key: 'toolRequirement', label: 'Tool Requirement' },
  ]} />;
}
