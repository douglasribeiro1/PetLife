export enum Species {
  Dog = 'Cachorro',
  Cat = 'Gato',
  Bird = 'Pássaro',
  Other = 'Outro'
}

export enum RecordType {
  Vaccine = 'Vacina',
  Consultation = 'Consulta',
  Exam = 'Exame',
  Surgery = 'Cirurgia',
  Medication = 'Medicamento',
  Note = 'Anotação',
  Weight = 'Peso'
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string;
  photoData?: string; // Base64 image
  createdAt: number;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  type: RecordType;
  date: string;
  title: string;
  description: string;
  doctorName?: string;
  nextDueDate?: string;
  attachmentData?: string; // Base64
  attachmentType?: string; // MIME type (e.g., 'image/jpeg', 'application/pdf')
  createdAt: number;
}

export interface AppState {
  pets: Pet[];
  records: MedicalRecord[];
  loading: boolean;
}