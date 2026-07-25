import AssignedResidentsPage from '../caregiver/AssignedResidentsPage';
import staffResidentService from '../../services/staffResident.service';

export default function DoctorAssignedResidentsPage() {
  return <AssignedResidentsPage service={staffResidentService} i18nNs="doctor" showMealIntakeLink={false} />;
}
