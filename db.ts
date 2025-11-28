import { Pet, MedicalRecord, RecordType, Species } from './types';

const DB_NAME = 'PetLifeDB';
const DB_VERSION = 1;

// Helper to update last modified timestamp
const updateLastModified = () => {
  const now = new Date().toISOString();
  localStorage.setItem('petlife_last_modified', now);
  // Dispatch event so UI can update immediately
  window.dispatchEvent(new Event('petlife_data_updated'));
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB Error:", event);
      reject("Error opening database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('pets')) {
        db.createObjectStore('pets', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('records')) {
        const recordStore = db.createObjectStore('records', { keyPath: 'id' });
        recordStore.createIndex('petId', 'petId', { unique: false });
      }
    };
  });
};

export const savePet = async (pet: Pet): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pets', 'readwrite');
    const store = tx.objectStore('pets');
    const request = store.put(pet);
    request.onsuccess = () => {
        updateLastModified();
        resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPets = async (): Promise<Pet[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pets', 'readonly');
    const store = tx.objectStore('pets');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getPetById = async (id: string): Promise<Pet | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pets', 'readonly');
      const store = tx.objectStore('pets');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
};

export const deletePet = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pets', 'records'], 'readwrite');
    
    // Delete pet
    tx.objectStore('pets').delete(id);
    
    // Delete associated records
    const recordStore = tx.objectStore('records');
    const index = recordStore.index('petId');
    const request = index.openCursor(IDBKeyRange.only(id));
    
    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => {
        updateLastModified();
        resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const saveRecord = async (record: MedicalRecord): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const request = store.put(record);
    request.onsuccess = () => {
        updateLastModified();
        resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteRecord = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      const request = store.delete(id);
      request.onsuccess = () => {
        updateLastModified();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
};

export const getRecordsByPet = async (petId: string): Promise<MedicalRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const store = tx.objectStore('records');
    const index = store.index('petId');
    const request = index.getAll(petId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllRecords = async (): Promise<MedicalRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const store = tx.objectStore('records');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Backup & Restore ---

export interface BackupData {
    pets: Pet[];
    records: MedicalRecord[];
    exportDate: string;
    version: number;
}

export const exportData = async (): Promise<BackupData> => {
    const db = await initDB();
    return new Promise(async (resolve, reject) => {
        try {
            const tx = db.transaction(['pets', 'records'], 'readonly');
            
            const petsReq = tx.objectStore('pets').getAll();
            const recordsReq = tx.objectStore('records').getAll();

            const pets = await new Promise<Pet[]>((res) => { petsReq.onsuccess = () => res(petsReq.result) });
            const records = await new Promise<MedicalRecord[]>((res) => { recordsReq.onsuccess = () => res(recordsReq.result) });

            resolve({
                pets,
                records,
                exportDate: new Date().toISOString(),
                version: 1
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const importData = async (data: BackupData): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['pets', 'records'], 'readwrite');
        
        const petStore = tx.objectStore('pets');
        const recordStore = tx.objectStore('records');

        data.pets.forEach(pet => petStore.put(pet));
        data.records.forEach(rec => recordStore.put(rec));

        tx.oncomplete = () => {
            updateLastModified();
            resolve();
        };
        tx.onerror = () => reject("Erro na importação");
    });
};

// --- Seed Data ---

export const seedDatabase = async () => {
    const pets = await getPets();
    if (pets.length > 0) return; // Only seed if empty

    const thorId = crypto.randomUUID();
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

    const thor: Pet = {
        id: thorId,
        name: "Thor",
        species: Species.Dog,
        breed: "Golden Retriever",
        birthDate: "2020-05-15",
        createdAt: Date.now()
    };

    await savePet(thor); // This calls updateLastModified inside savePet

    const records: MedicalRecord[] = [
        {
            id: crypto.randomUUID(),
            petId: thorId,
            type: RecordType.Vaccine,
            date: sixMonthsAgo.toISOString().split('T')[0],
            title: "V10 + Raiva",
            description: "Reforço anual aplicado na clínica VetCare.",
            nextDueDate: new Date(sixMonthsAgo.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: Date.now(),
        },
        {
            id: crypto.randomUUID(),
            petId: thorId,
            type: RecordType.Weight,
            date: sixMonthsAgo.toISOString().split('T')[0],
            title: "Pesagem",
            description: "28.5",
            createdAt: Date.now(),
        },
        {
            id: crypto.randomUUID(),
            petId: thorId,
            type: RecordType.Weight,
            date: oneMonthAgo.toISOString().split('T')[0],
            title: "Pesagem",
            description: "29.2",
            createdAt: Date.now(),
        },
        {
            id: crypto.randomUUID(),
            petId: thorId,
            type: RecordType.Weight,
            date: today.toISOString().split('T')[0],
            title: "Pesagem",
            description: "29.5",
            createdAt: Date.now(),
        },
        {
            id: crypto.randomUUID(),
            petId: thorId,
            type: RecordType.Consultation,
            date: oneMonthAgo.toISOString().split('T')[0],
            title: "Dermatologista",
            description: "Apresentou leve alergia nas patas. Receitado shampoo hipoalergênico.",
            createdAt: Date.now(),
        }
    ];

    for (const r of records) {
        await saveRecord(r);
    }
};