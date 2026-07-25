import AssignedResidentsPage from '../caregiver/AssignedResidentsPage';
import staffResidentService from '../../services/staffResident.service';

export default function NurseAssignedResidentsPage() {
  return <AssignedResidentsPage service={staffResidentService} i18nNs="nurse" showMealIntakeLink={false} />;
}
